import { Customer } from '../models/Customer.js';
import { CustomerLedgerEntry } from '../models/CustomerLedgerEntry.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { rupeesToPaise } from '../utils/money.js';

export async function getCustomers(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { search, page = 1, limit = 50 } = req.query;

    const query = { shopId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Customer.countDocuments(query)
    ]);

    return sendSuccess(res, customers, 'Customers retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { name, phone, email, notes, address, creditLimit = 0, openingUdhaar = 0 } = req.body;

    if (!name || !phone) {
      return sendError(res, 'Name and phone number are required', 400);
    }

    const cleanPhone = phone.trim();
    const existing = await Customer.findOne({ shopId, phone: cleanPhone });
    if (existing) {
      return sendError(res, `Customer with phone '${cleanPhone}' is already registered in this shop.`, 409);
    }

    const openingPaise = openingUdhaar ? rupeesToPaise(openingUdhaar) : 0;
    const creditLimitPaise = creditLimit ? rupeesToPaise(creditLimit) : 0;

    const customer = await Customer.create({
      shopId,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : '',
      creditLimit: creditLimitPaise,
      outstandingUdhaar: openingPaise
    });

    if (openingPaise > 0) {
      await CustomerLedgerEntry.create({
        shopId,
        customerId: customer._id,
        entryType: 'opening_balance',
        amount: openingPaise,
        debit: openingPaise,
        credit: 0,
        runningBalance: openingPaise,
        referenceId: `OPN-${customer._id.toString().slice(-6)}`,
        notes: 'Initial opening balance',
        performedBy: req.user?._id || null,
        performedByName: req.user?.name || 'Shop Admin'
      });
    }

    return sendSuccess(res, customer, 'Customer created successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function recordUdhaarPayment(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { id } = req.params;
    const { amount, action = 'payment', notes = '', paymentMethod = 'cash' } = req.body;

    const paise = rupeesToPaise(amount);
    const customer = await Customer.findOne({ _id: id, shopId });
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    if (action === 'payment') {
      customer.outstandingUdhaar = Math.max(0, customer.outstandingUdhaar - paise);
    } else {
      customer.outstandingUdhaar += paise;
    }

    await customer.save();

    await CustomerLedgerEntry.create({
      shopId,
      customerId: customer._id,
      entryType: action === 'payment' ? 'payment_received' : 'debit_adjustment',
      amount: paise,
      debit: action === 'payment' ? 0 : paise,
      credit: action === 'payment' ? paise : 0,
      runningBalance: customer.outstandingUdhaar,
      referenceId: `${action === 'payment' ? 'PAY' : 'ADJ'}-${Date.now().toString().slice(-6)}`,
      paymentMethod: action === 'payment' ? paymentMethod : '',
      notes: notes || `Direct ${action === 'payment' ? 'payment received' : 'credit added'}`,
      performedBy: req.user?._id || null,
      performedByName: req.user?.name || 'Cashier'
    });

    return sendSuccess(res, customer, `Udhaar ${action === 'payment' ? 'payment recorded' : 'credit added'}`);
  } catch (err) {
    next(err);
  }
}
