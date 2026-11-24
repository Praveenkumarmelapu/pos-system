import { Customer } from '../models/Customer.js';
import { CustomerLedgerEntry } from '../models/CustomerLedgerEntry.js';
import { CustomerPayment } from '../models/CustomerPayment.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { rupeesToPaise } from '../utils/money.js';

function formatReceiptNumber(count) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(count + 1).padStart(5, '0');
  return `REC-${yearMonth}-${seq}`;
}

export async function getKhataSummary(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [receivablesAgg, debtorCount, monthCollectionsAgg, recentPayments] = await Promise.all([
      // 1. Total outstanding debt (Paise)
      Customer.aggregate([
        { $match: { shopId, outstandingUdhaar: { $gt: 0 } } },
        { $group: { _id: null, totalUdhaar: { $sum: '$outstandingUdhaar' } } }
      ]),
      // 2. Count of customers with positive debt
      Customer.countDocuments({ shopId, outstandingUdhaar: { $gt: 0 } }),
      // 3. Month collections from payments (Paise)
      CustomerPayment.aggregate([
        { $match: { shopId, paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, totalCollected: { $sum: '$amountPaid' }, paymentCount: { $sum: 1 } } }
      ]),
      // 4. Recent payments
      CustomerPayment.find({ shopId })
        .populate('customerId', 'name phone')
        .sort({ paymentDate: -1 })
        .limit(10)
    ]);

    const totalOutstandingPaise = receivablesAgg[0]?.totalUdhaar || 0;
    const monthCollectedPaise = monthCollectionsAgg[0]?.totalCollected || 0;
    const monthPaymentCount = monthCollectionsAgg[0]?.paymentCount || 0;

    return sendSuccess(res, {
      totalOutstandingPaise,
      debtorCount,
      monthCollectedPaise,
      monthPaymentCount,
      recentPayments
    });
  } catch (err) {
    next(err);
  }
}

export async function getKhataCustomers(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { search, filter = 'debtors_only', page = 1, limit = 50 } = req.query;

    const query = { shopId };

    if (filter === 'debtors_only') {
      query.outstandingUdhaar = { $gt: 0 };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ outstandingUdhaar: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Customer.countDocuments(query)
    ]);

    return sendSuccess(res, customers, 'Khata customers retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerLedger(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { customerId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const customer = await Customer.findOne({ _id: customerId, shopId });
    if (!customer) {
      return sendError(res, 'Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const query = { shopId, customerId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [entries, total, totalsAgg] = await Promise.all([
      CustomerLedgerEntry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      CustomerLedgerEntry.countDocuments(query),
      CustomerLedgerEntry.aggregate([
        { $match: { shopId, customerId: customer._id } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$debit' },
            totalCredit: { $sum: '$credit' }
          }
        }
      ])
    ]);

    return sendSuccess(res, {
      customer,
      entries,
      summary: {
        totalDebit: totalsAgg[0]?.totalDebit || 0,
        totalCredit: totalsAgg[0]?.totalCredit || 0,
        currentBalance: customer.outstandingUdhaar
      }
    }, 'Customer ledger retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function receiveKhataPayment(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { customerId, amount, paymentMethod = 'cash', referenceNote = '', idempotencyKey } = req.body;

    if (!customerId) {
      return sendError(res, 'Customer ID is required', 400);
    }
    if (!amount || amount <= 0) {
      return sendError(res, 'Valid payment amount greater than zero is required', 400);
    }
    if (!idempotencyKey) {
      return sendError(res, 'Idempotency key is required to prevent double billing', 400);
    }

    // Check idempotency
    const existingPayment = await CustomerPayment.findOne({ shopId, idempotencyKey });
    if (existingPayment) {
      return sendSuccess(res, existingPayment, 'Payment already processed (Idempotent response)', 200);
    }

    const customer = await Customer.findOne({ _id: customerId, shopId });
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    const amountPaise = rupeesToPaise(amount);
    const previousBalance = customer.outstandingUdhaar;
    const newBalance = Math.max(0, previousBalance - amountPaise);

    const paymentCount = await CustomerPayment.countDocuments({ shopId });
    const receiptNumber = formatReceiptNumber(paymentCount);

    // Save payment
    const payment = await CustomerPayment.create({
      shopId,
      customerId: customer._id,
      receiptNumber,
      idempotencyKey,
      amountPaid: amountPaise,
      paymentMethod,
      previousBalance,
      newBalance,
      referenceNote: referenceNote || '',
      receivedBy: req.user._id,
      receivedByName: req.user.name,
      paymentDate: new Date()
    });

    // Update customer debt
    customer.outstandingUdhaar = newBalance;
    await customer.save();

    // Create append-only ledger entry
    await CustomerLedgerEntry.create({
      shopId,
      customerId: customer._id,
      entryType: 'payment_received',
      amount: amountPaise,
      debit: 0,
      credit: amountPaise,
      runningBalance: newBalance,
      referenceId: receiptNumber,
      paymentId: payment._id,
      paymentMethod,
      notes: referenceNote || `Payment received via ${paymentMethod.toUpperCase()}`,
      performedBy: req.user._id,
      performedByName: req.user.name
    });

    return sendSuccess(res, {
      payment,
      updatedBalance: newBalance,
      customer
    }, 'Payment received successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function addKhataAdjustment(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { customerId } = req.params;
    const { type, amount, notes = '' } = req.body; // type: 'debit' (increase debt) or 'credit' (decrease debt)

    if (!type || !['debit', 'credit'].includes(type)) {
      return sendError(res, "Adjustment type must be 'debit' or 'credit'", 400);
    }
    if (!amount || amount <= 0) {
      return sendError(res, 'Valid adjustment amount greater than zero is required', 400);
    }

    const customer = await Customer.findOne({ _id: customerId, shopId });
    if (!customer) {
      return sendError(res, 'Customer not found', 404);
    }

    const amountPaise = rupeesToPaise(amount);
    const previousBalance = customer.outstandingUdhaar;
    let newBalance = previousBalance;

    if (type === 'debit') {
      newBalance = previousBalance + amountPaise;
    } else {
      newBalance = Math.max(0, previousBalance - amountPaise);
    }

    customer.outstandingUdhaar = newBalance;
    await customer.save();

    const ref = `ADJ-${Date.now().toString().slice(-6)}`;
    const entry = await CustomerLedgerEntry.create({
      shopId,
      customerId: customer._id,
      entryType: type === 'debit' ? 'debit_adjustment' : 'credit_adjustment',
      amount: amountPaise,
      debit: type === 'debit' ? amountPaise : 0,
      credit: type === 'credit' ? amountPaise : 0,
      runningBalance: newBalance,
      referenceId: ref,
      notes: notes || `Manual ${type} adjustment`,
      performedBy: req.user._id,
      performedByName: req.user.name
    });

    return sendSuccess(res, { entry, updatedBalance: newBalance, customer }, 'Adjustment recorded successfully');
  } catch (err) {
    next(err);
  }
}

export async function recordKhataReminder(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { customerId } = req.params;
    const { channel = 'whatsapp', customNote = '', phone = '' } = req.body || {};

    const customer = await Customer.findOne({ _id: customerId, shopId });
    if (!customer) {
      return sendError(res, 'Customer not found', 404, 'CUSTOMER_NOT_FOUND');
    }

    const now = new Date();
    customer.lastReminderSentAt = now;
    customer.reminderCount = (customer.reminderCount || 0) + 1;
    await customer.save();

    await AuditLog.create({
      shopId,
      userId: req.user?._id || null,
      action: 'khata:reminder_sent',
      resourceType: 'Customer',
      resourceId: customer._id.toString(),
      details: {
        customerName: customer.name,
        phone: phone || customer.phone,
        outstandingUdhaar: customer.outstandingUdhaar,
        channel,
        customNote
      }
    });

    return sendSuccess(res, {
      customer,
      lastReminderSentAt: now,
      reminderCount: customer.reminderCount
    }, 'Reminder recorded successfully');
  } catch (err) {
    next(err);
  }
}
