import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { Customer } from '../models/Customer.js';
import { CustomerLedgerEntry } from '../models/CustomerLedgerEntry.js';
import { AuditLog } from '../models/AuditLog.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { rupeesToPaise } from '../utils/money.js';
import { createSaleSchema, createReturnSchema } from '../validators/sale.validator.js';

function formatInvoiceNumber(count) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seq = String(count + 1).padStart(5, '0');
  return `INV-${yearMonth}-${seq}`;
}

export async function createSale(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const validated = createSaleSchema.parse(req.body);

    // 1. Idempotency Check: Prevent duplicate billing on network re-tries
    const existingSale = await Sale.findOne({ shopId, idempotencyKey: validated.idempotencyKey });
    if (existingSale) {
      return sendSuccess(res, existingSale, 'Sale already processed (Idempotent response)', 200);
    }

    // 2. Fetch authoritative products from Database
    const productIds = validated.items.map(item => item.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds }, shopId, isActive: true });

    if (dbProducts.length !== productIds.length) {
      return sendError(res, 'One or more items in the cart are invalid or inactive.', 400, 'INVALID_CART_ITEMS');
    }

    const productMap = new Map();
    dbProducts.forEach(p => productMap.set(p._id.toString(), p));

    // 3. Stock Availability & Line Item Calculation
    const saleItems = [];
    let subtotal = 0;
    let totalTax = 0;
    let totalCost = 0;

    for (const item of validated.items) {
      const p = productMap.get(item.productId);
      const qty = item.quantity;

      // Validate stock unless negative stock is allowed by shop settings
      const allowNegative = req.tenant.settings?.allowNegativeStock || false;
      if (!allowNegative && p.stockQuantity < qty) {
        return sendError(
          res,
          `Insufficient stock for '${p.name}'. Available: ${p.stockQuantity}, Requested: ${qty}`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const unitPrice = p.sellingPrice; // Authoritative price in Paise
      const itemDiscountPaise = item.discountAmount ? rupeesToPaise(item.discountAmount) : 0;
      const baseAmount = Math.max(0, Math.round(unitPrice * qty) - itemDiscountPaise);

      // Tax calculation (GST)
      let taxAmount = 0;
      if (p.taxRate > 0) {
        taxAmount = Math.round((baseAmount * p.taxRate) / 100);
      }

      const lineTotal = baseAmount + taxAmount;

      subtotal += baseAmount;
      totalTax += taxAmount;
      totalCost += Math.round((p.purchasePrice || 0) * qty);

      saleItems.push({
        productId: p._id,
        barcode: p.barcode,
        name: p.name,
        quantity: qty,
        unitPrice,
        mrp: p.mrp || unitPrice,
        purchasePrice: p.purchasePrice || 0,
        discountAmount: itemDiscountPaise,
        taxRate: p.taxRate || 0,
        taxAmount,
        lineTotal
      });
    }

    const billDiscountPaise = validated.totalDiscount ? rupeesToPaise(validated.totalDiscount) : 0;
    const finalAmount = Math.max(0, subtotal + totalTax - billDiscountPaise);

    // Calculate paidAmount and creditAmount in integer Paise
    let paidPaise = 0;
    let creditPaise = 0;
    let isKhata = false;

    if (validated.paymentMethod === 'credit') {
      creditPaise = finalAmount;
      paidPaise = 0;
      isKhata = true;
    } else if (validated.creditAmount !== undefined && validated.creditAmount > 0) {
      creditPaise = rupeesToPaise(validated.creditAmount);
      paidPaise = validated.paidAmount !== undefined ? rupeesToPaise(validated.paidAmount) : Math.max(0, finalAmount - creditPaise);
      isKhata = creditPaise > 0;
    } else if (validated.paidAmount !== undefined && validated.paidAmount < (finalAmount / 100)) {
      paidPaise = rupeesToPaise(validated.paidAmount);
      creditPaise = Math.max(0, finalAmount - paidPaise);
      isKhata = creditPaise > 0;
    } else {
      paidPaise = finalAmount;
      creditPaise = 0;
      isKhata = false;
    }

    // Khata requires a registered customer
    let customerDoc = null;
    if (isKhata || creditPaise > 0) {
      if (!validated.customerId) {
        return sendError(res, 'A registered customer is required to add an amount to Khata / Udhaar.', 400, 'CUSTOMER_REQUIRED_FOR_KHATA');
      }
      customerDoc = await Customer.findOne({ _id: validated.customerId, shopId });
      if (!customerDoc) {
        return sendError(res, 'Selected customer does not exist in this shop.', 404, 'CUSTOMER_NOT_FOUND');
      }
      if (customerDoc.creditLimit > 0 && (customerDoc.outstandingUdhaar + creditPaise) > customerDoc.creditLimit) {
        return sendError(
          res,
          `Credit limit of ₹${(customerDoc.creditLimit / 100).toFixed(2)} exceeded. Current balance: ₹${(customerDoc.outstandingUdhaar / 100).toFixed(2)}, attempted addition: ₹${(creditPaise / 100).toFixed(2)}`,
          400,
          'CREDIT_LIMIT_EXCEEDED'
        );
      }
    }

    const breakdown = {
      cash: validated.paymentBreakdown?.cash ? rupeesToPaise(validated.paymentBreakdown.cash) : (validated.paymentMethod === 'cash' ? paidPaise : 0),
      upi: validated.paymentBreakdown?.upi ? rupeesToPaise(validated.paymentBreakdown.upi) : (validated.paymentMethod === 'upi' ? paidPaise : 0),
      card: validated.paymentBreakdown?.card ? rupeesToPaise(validated.paymentBreakdown.card) : (validated.paymentMethod === 'card' ? paidPaise : 0),
      credit: creditPaise
    };

    // 4. Generate Sequential Invoice Number
    const salesCount = await Sale.countDocuments({ shopId });
    const invoiceNumber = formatInvoiceNumber(salesCount);

    // 5. Decrement Stock Quantities Atomically
    const stockBulkOps = saleItems.map(item => ({
      updateOne: {
        filter: { _id: item.productId, shopId },
        update: { $inc: { stockQuantity: -item.quantity } }
      }
    }));

    await Product.bulkWrite(stockBulkOps);

    // 6. Create Sale Record
    const sale = await Sale.create({
      shopId,
      invoiceNumber,
      idempotencyKey: validated.idempotencyKey,
      cashierId: req.user._id,
      cashierName: req.user.name,
      customerId: validated.customerId || null,
      customerName: customerDoc ? customerDoc.name : (validated.customerName || 'Walk-in Customer'),
      customerPhone: customerDoc ? customerDoc.phone : (validated.customerPhone || null),
      items: saleItems,
      subtotal,
      totalDiscount: billDiscountPaise,
      totalTax,
      grandTotal: finalAmount,
      totalCost,
      paymentMethod: validated.paymentMethod,
      paidAmount: paidPaise,
      creditAmount: creditPaise,
      isKhata,
      paymentBreakdown: breakdown,
      paymentDetails: {
        receivedAmount: validated.paymentDetails?.receivedAmount ? rupeesToPaise(validated.paymentDetails.receivedAmount) : paidPaise,
        changeReturned: validated.paymentDetails?.receivedAmount
          ? Math.max(0, rupeesToPaise(validated.paymentDetails.receivedAmount) - paidPaise)
          : 0,
        referenceNote: validated.paymentDetails?.referenceNote || ''
      },
      status: 'completed',
      saleDate: new Date(),
      notes: validated.notes || ''
    });

    // 7. Record Stock Movements Audit Ledger
    const movementRecords = saleItems.map(item => {
      const p = productMap.get(item.productId.toString());
      return {
        shopId,
        productId: item.productId,
        barcode: item.barcode,
        type: 'sale',
        quantityDelta: -item.quantity,
        previousStock: p.stockQuantity,
        newStock: Math.round((p.stockQuantity - item.quantity) * 1000) / 1000,
        referenceId: invoiceNumber,
        reason: `Sale ${invoiceNumber}`,
        performedBy: req.user._id
      };
    });

    await StockMovement.insertMany(movementRecords);

    // 8. Update Customer Profile & Khata Ledger if attached
    if (validated.customerId) {
      if (creditPaise > 0) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { _id: validated.customerId, shopId },
          {
            $inc: {
              totalPurchases: finalAmount,
              totalBills: 1,
              outstandingUdhaar: creditPaise
            }
          },
          { new: true }
        );

        await CustomerLedgerEntry.create({
          shopId,
          customerId: validated.customerId,
          entryType: 'credit_sale',
          amount: creditPaise,
          debit: creditPaise,
          credit: 0,
          runningBalance: updatedCustomer.outstandingUdhaar,
          referenceId: invoiceNumber,
          saleId: sale._id,
          paymentMethod: validated.paymentMethod,
          notes: `Credit Bill #${invoiceNumber} (Total: ₹${(finalAmount / 100).toFixed(2)}, Paid: ₹${(paidPaise / 100).toFixed(2)}, Khata: ₹${(creditPaise / 100).toFixed(2)})`,
          performedBy: req.user._id,
          performedByName: req.user.name
        });
      } else {
        await Customer.findOneAndUpdate(
          { _id: validated.customerId, shopId },
          {
            $inc: { totalPurchases: finalAmount, totalBills: 1 }
          }
        );
      }
    }

    return sendSuccess(res, sale, 'Bill generated successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function getSales(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { startDate, endDate, cashierId, paymentMethod, page = 1, limit = 25 } = req.query;

    const query = { shopId };

    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) query.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.saleDate.$lte = end;
      }
    }

    if (cashierId) query.cashierId = cashierId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ saleDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Sale.countDocuments(query)
    ]);

    return sendSuccess(res, sales, 'Sales history retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function getSaleById(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = req.tenant.shopId;

    const sale = await Sale.findOne({ _id: id, shopId });
    if (!sale) {
      return sendError(res, 'Sale invoice not found', 404, 'SALE_NOT_FOUND');
    }

    return sendSuccess(res, sale);
  } catch (err) {
    next(err);
  }
}

/**
 * Process a return/refund against an existing bill.
 * - Restores stock for returned quantities and records stock movements
 * - Refund is proportional to each line's billed total (discount + GST included)
 * - 'khata_adjust' reduces the customer's outstanding udhaar instead of a cash refund
 * - Marks the bill 'partially_returned' or 'returned' when every item is back
 */
export async function returnSaleItems(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { id } = req.params;
    const validated = createReturnSchema.parse(req.body);

    const sale = await Sale.findOne({ _id: id, shopId });
    if (!sale) {
      return sendError(res, 'Sale invoice not found', 404, 'SALE_NOT_FOUND');
    }
    if (sale.status === 'cancelled') {
      return sendError(res, 'This bill was cancelled and cannot be returned.', 400, 'SALE_CANCELLED');
    }
    if (sale.status === 'returned') {
      return sendError(res, 'This bill has already been fully returned.', 400, 'ALREADY_RETURNED');
    }

    // Quantities already returned per product
    const returnedSoFar = new Map();
    (sale.returns || []).forEach((entry) => {
      const key = entry.productId.toString();
      returnedSoFar.set(key, (returnedSoFar.get(key) || 0) + entry.quantity);
    });

    // Merge duplicate product lines in the request
    const requestMap = new Map();
    for (const item of validated.items) {
      requestMap.set(item.productId, (requestMap.get(item.productId) || 0) + item.quantity);
    }

    const dbProducts = await Product.find({ _id: { $in: [...requestMap.keys()] }, shopId });
    const productMap = new Map();
    dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

    let refundSubtotal = 0;
    let refundTax = 0;
    let refundTotal = 0;
    const returnEntries = [];
    const stockBulkOps = [];
    const movementRecords = [];

    for (const [productId, qty] of requestMap) {
      const line = sale.items.find((i) => i.productId.toString() === productId);
      if (!line) {
        return sendError(res, 'One or more selected items are not part of this bill.', 400, 'ITEM_NOT_IN_SALE');
      }
      const alreadyReturned = returnedSoFar.get(productId) || 0;
      const remainingQty = Math.round((line.quantity - alreadyReturned) * 1000) / 1000;
      if (qty > remainingQty + 1e-9) {
        return sendError(
          res,
          `Only ${remainingQty} qty of '${line.name}' can still be returned from this bill.`,
          400,
          'RETURN_QTY_EXCEEDS'
        );
      }

      // Proportional refund: lineTotal already includes item discount and GST
      const lineRefund = Math.round((line.lineTotal * qty) / line.quantity);
      const lineTax = Math.round((line.taxAmount * qty) / line.quantity);
      refundTotal += lineRefund;
      refundTax += lineTax;
      refundSubtotal += lineRefund - lineTax;

      returnEntries.push({
        productId: line.productId,
        barcode: line.barcode,
        name: line.name,
        quantity: qty,
        unitPrice: line.unitPrice,
        taxAmount: lineTax,
        refundAmount: lineRefund,
        refundMethod: validated.refundMethod,
        reason: validated.reason || '',
        returnedAt: new Date(),
        returnedBy: req.user._id,
        returnedByName: req.user.name
      });

      const product = productMap.get(productId);
      if (product) {
        stockBulkOps.push({
          updateOne: {
            filter: { _id: product._id, shopId },
            update: { $inc: { stockQuantity: qty } }
          }
        });
        movementRecords.push({
          shopId,
          productId: product._id,
          barcode: line.barcode,
          type: 'return',
          quantityDelta: qty,
          previousStock: product.stockQuantity,
          newStock: Math.round((product.stockQuantity + qty) * 1000) / 1000,
          referenceId: sale.invoiceNumber,
          reason: `Return against ${sale.invoiceNumber}${validated.reason ? ` - ${validated.reason}` : ''}`,
          performedBy: req.user._id
        });
      }
    }

    // Khata handling: reduce outstanding udhaar instead of handing cash back
    let khataAdjusted = 0;
    if (validated.refundMethod === 'khata_adjust') {
      if (!sale.customerId) {
        return sendError(res, 'This bill has no registered customer, so the refund cannot go to Khata. Choose cash/UPI/card instead.', 400, 'NO_CUSTOMER_FOR_KHATA_ADJUST');
      }
      const customer = await Customer.findOne({ _id: sale.customerId, shopId });
      if (!customer) {
        return sendError(res, 'The customer on this bill no longer exists.', 404, 'CUSTOMER_NOT_FOUND');
      }
      khataAdjusted = Math.min(refundTotal, Math.max(0, customer.outstandingUdhaar));
      if (khataAdjusted > 0) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { _id: customer._id, shopId },
          { $inc: { outstandingUdhaar: -khataAdjusted } },
          { new: true }
        );
        await CustomerLedgerEntry.create({
          shopId,
          customerId: customer._id,
          entryType: 'sale_return',
          amount: khataAdjusted,
          debit: 0,
          credit: khataAdjusted,
          runningBalance: updatedCustomer.outstandingUdhaar,
          referenceId: sale.invoiceNumber,
          saleId: sale._id,
          paymentMethod: 'return',
          notes: `Return against Bill #${sale.invoiceNumber} (Refund: Rs ${(refundTotal / 100).toFixed(2)}, Khata reduced: Rs ${(khataAdjusted / 100).toFixed(2)})`,
          performedBy: req.user._id,
          performedByName: req.user.name
        });
      }
    }

    // Update the sale record
    sale.returns = [...(sale.returns || []), ...returnEntries];
    sale.refundTotal = (sale.refundTotal || 0) + refundTotal;
    const fullyReturned = sale.items.every((line) => {
      const key = line.productId.toString();
      const totalReturned = (returnedSoFar.get(key) || 0) + (requestMap.get(key) || 0);
      return totalReturned >= line.quantity - 1e-9;
    });
    sale.status = fullyReturned ? 'returned' : 'partially_returned';
    await sale.save();

    if (stockBulkOps.length > 0) await Product.bulkWrite(stockBulkOps);
    if (movementRecords.length > 0) await StockMovement.insertMany(movementRecords);

    await AuditLog.create({
      shopId,
      userId: req.user._id,
      action: 'sale:returned',
      resourceType: 'sale',
      resourceId: sale._id.toString(),
      details: {
        invoiceNumber: sale.invoiceNumber,
        refundTotal,
        refundMethod: validated.refundMethod,
        khataAdjusted,
        itemCount: returnEntries.length,
        status: sale.status
      }
    }).catch((error) => console.error('Could not record the sale return audit event:', error.message));

    return sendSuccess(res, {
      sale,
      refund: {
        subtotal: refundSubtotal,
        tax: refundTax,
        total: refundTotal,
        method: validated.refundMethod,
        khataAdjusted
      },
      returnedItems: returnEntries
    }, 'Return processed successfully', 201);
  } catch (err) {
    next(err);
  }
}
