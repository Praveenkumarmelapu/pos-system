import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { sendSuccess } from '../utils/response.js';

/**
 * Returns UTC Date object corresponding to the start of today in Asia/Kolkata (+05:30)
 */
function getStartOfTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);

  // Set IST hours to 00:00:00
  istDate.setUTCHours(0, 0, 0, 0);

  // Convert back to UTC timestamp
  return new Date(istDate.getTime() - istOffset);
}

function getStartOfMonthIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);

  istDate.setUTCDate(1);
  istDate.setUTCHours(0, 0, 0, 0);

  return new Date(istDate.getTime() - istOffset);
}

/**
 * Helper to compute detailed payment breakdown (Cash, UPI, Credit, Card) for a given time window
 */
export async function getPaymentBreakdownData(shopId, startDate, endDate) {
  const match = { shopId, status: { $in: ['completed', 'partially_returned'] } };
  if (startDate || endDate) {
    match.saleDate = {};
    if (startDate) match.saleDate.$gte = startDate;
    if (endDate) match.saleDate.$lt = endDate;
  }

  const results = await Sale.aggregate([
    { $match: match },
    {
      $project: {
        paymentMethod: 1,
        grandTotal: 1,
        paidAmount: 1,
        creditAmount: 1,
        cashPart: {
          $cond: [
            { $gt: [{ $ifNull: ['$paymentBreakdown.cash', 0] }, 0] },
            '$paymentBreakdown.cash',
            { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, { $ifNull: ['$paidAmount', '$grandTotal'] }, 0] }
          ]
        },
        upiPart: {
          $cond: [
            { $gt: [{ $ifNull: ['$paymentBreakdown.upi', 0] }, 0] },
            '$paymentBreakdown.upi',
            { $cond: [{ $eq: ['$paymentMethod', 'upi'] }, { $ifNull: ['$paidAmount', '$grandTotal'] }, 0] }
          ]
        },
        cardPart: {
          $cond: [
            { $gt: [{ $ifNull: ['$paymentBreakdown.card', 0] }, 0] },
            '$paymentBreakdown.card',
            { $cond: [{ $eq: ['$paymentMethod', 'card'] }, { $ifNull: ['$paidAmount', '$grandTotal'] }, 0] }
          ]
        },
        creditPart: {
          $cond: [
            { $gt: [{ $ifNull: ['$paymentBreakdown.credit', 0] }, 0] },
            '$paymentBreakdown.credit',
            {
              $cond: [
                { $gt: [{ $ifNull: ['$creditAmount', 0] }, 0] },
                '$creditAmount',
                { $cond: [{ $eq: ['$paymentMethod', 'credit'] }, '$grandTotal', 0] }
              ]
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $subtract: ['$grandTotal', { $ifNull: ['$refundTotal', 0] }] } },
        totalBills: { $sum: 1 },
        cashTotal: { $sum: '$cashPart' },
        upiTotal: { $sum: '$upiPart' },
        cardTotal: { $sum: '$cardPart' },
        creditTotal: { $sum: '$creditPart' },
        cashBills: { $sum: { $cond: [{ $gt: ['$cashPart', 0] }, 1, 0] } },
        upiBills: { $sum: { $cond: [{ $gt: ['$upiPart', 0] }, 1, 0] } },
        cardBills: { $sum: { $cond: [{ $gt: ['$cardPart', 0] }, 1, 0] } },
        creditBills: { $sum: { $cond: [{ $gt: ['$creditPart', 0] }, 1, 0] } }
      }
    }
  ]);

  const summary = results[0] || {
    totalSales: 0,
    totalBills: 0,
    cashTotal: 0,
    upiTotal: 0,
    cardTotal: 0,
    creditTotal: 0,
    cashBills: 0,
    upiBills: 0,
    cardBills: 0,
    creditBills: 0
  };

  const total = summary.totalSales || (summary.cashTotal + summary.upiTotal + summary.cardTotal + summary.creditTotal) || 0;

  return {
    totalSales: summary.totalSales,
    totalBills: summary.totalBills,
    cash: {
      amount: summary.cashTotal,
      count: summary.cashBills,
      percentage: total > 0 ? Number(((summary.cashTotal / total) * 100).toFixed(1)) : 0
    },
    upi: {
      amount: summary.upiTotal,
      count: summary.upiBills,
      percentage: total > 0 ? Number(((summary.upiTotal / total) * 100).toFixed(1)) : 0
    },
    credit: {
      amount: summary.creditTotal,
      count: summary.creditBills,
      percentage: total > 0 ? Number(((summary.creditTotal / total) * 100).toFixed(1)) : 0
    },
    card: {
      amount: summary.cardTotal,
      count: summary.cardBills,
      percentage: total > 0 ? Number(((summary.cardTotal / total) * 100).toFixed(1)) : 0
    }
  };
}

export async function getPaymentSummaryReport(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const range = req.query.range || 'today'; // today | yesterday | 7d | month | all

    const startOfToday = getStartOfTodayIST();
    let startDate = null;
    let endDate = null;

    if (range === 'today') {
      startDate = startOfToday;
    } else if (range === 'yesterday') {
      startDate = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      endDate = startOfToday;
    } else if (range === '7d') {
      startDate = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = getStartOfMonthIST();
    } else if (range === 'all') {
      startDate = null;
    }

    const data = await getPaymentBreakdownData(shopId, startDate, endDate);
    return sendSuccess(res, { range, ...data }, 'Payment breakdown retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const startOfToday = getStartOfTodayIST();
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonth = getStartOfMonthIST();

    // Parallel Aggregations
    const [
      todaySalesData,
      yesterdaySalesData,
      monthSalesData,
      inventoryStats,
      recentSales,
      paymentDistribution,
      topSellingProducts,
      paymentBreakdownToday
    ] = await Promise.all([
      // 1. Today's sales
      Sale.aggregate([
        { $match: { shopId, saleDate: { $gte: startOfToday }, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCost: { $sum: '$totalCost' },
            totalBills: { $sum: 1 },
            totalDiscounts: { $sum: '$totalDiscount' },
            totalTax: { $sum: '$totalTax' }
          }
        }
      ]),

      // 2. Yesterday's sales
      Sale.aggregate([
        {
          $match: {
            shopId,
            saleDate: { $gte: startOfYesterday, $lt: startOfToday },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalBills: { $sum: 1 }
          }
        }
      ]),

      // 3. Month to date sales
      Sale.aggregate([
        { $match: { shopId, saleDate: { $gte: startOfMonth }, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$grandTotal' },
            totalCost: { $sum: '$totalCost' },
            totalBills: { $sum: 1 }
          }
        }
      ]),

      // 4. Inventory counts
      Product.aggregate([
        { $match: { shopId, isActive: true } },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lte: ['$stockQuantity', '$minStockThreshold'] },
                      { $gt: ['$stockQuantity', 0] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $lte: ['$stockQuantity', 0] }, 1, 0]
              }
            },
            totalInventoryValue: {
              $sum: { $multiply: ['$stockQuantity', '$purchasePrice'] }
            }
          }
        }
      ]),

      // 5. Recent 5 transactions
      Sale.find({ shopId })
        .sort({ saleDate: -1 })
        .limit(5)
        .select('invoiceNumber grandTotal paymentMethod saleDate customerName status items'),

      // 6. Payment method breakdown today
      Sale.aggregate([
        { $match: { shopId, saleDate: { $gte: startOfToday }, status: 'completed' } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]),

      // 7. Top 5 Best-Selling Products
      Sale.aggregate([
        { $match: { shopId, status: 'completed' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            barcode: { $first: '$items.barcode' },
            totalUnitsSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.lineTotal' }
          }
        },
        { $sort: { totalUnitsSold: -1 } },
        { $limit: 5 }
      ]),

      // 8. Payment breakdown today (Cash, UPI, Credit, Card)
      getPaymentBreakdownData(shopId, startOfToday, null)
    ]);

    const topSelling = await Promise.all(
      (topSellingProducts || []).map(async (item) => {
        const prod = await Product.findOne({ _id: item._id, shopId }).select('imageUrl category unit sellingPrice');
        return {
          ...item,
          imageUrl: prod?.imageUrl || '',
          category: prod?.category || 'General',
          unit: prod?.unit || 'pcs',
          sellingPrice: prod?.sellingPrice || 0
        };
      })
    );

    const today = todaySalesData[0] || { totalRevenue: 0, totalCost: 0, totalBills: 0, totalDiscounts: 0, totalTax: 0 };
    const yesterday = yesterdaySalesData[0] || { totalRevenue: 0, totalBills: 0 };
    const month = monthSalesData[0] || { totalRevenue: 0, totalCost: 0, totalBills: 0 };
    const inv = inventoryStats[0] || { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0, totalInventoryValue: 0 };

    const averageBillValue = today.totalBills > 0 ? Math.round(today.totalRevenue / today.totalBills) : 0;
    const estimatedGrossProfitToday = Math.max(0, today.totalRevenue - today.totalCost);

    return sendSuccess(res, {
      kpis: {
        todaySales: today.totalRevenue,
        yesterdaySales: yesterday.totalRevenue,
        monthSales: month.totalRevenue,
        todayBillsCount: today.totalBills,
        averageBillValue,
        estimatedGrossProfitToday,
        totalProducts: inv.totalProducts,
        lowStockProducts: inv.lowStockCount,
        outOfStockProducts: inv.outOfStockCount,
        totalInventoryValue: inv.totalInventoryValue
      },
      paymentDistribution,
      paymentBreakdown: paymentBreakdownToday,
      recentSales,
      topSellingProducts: topSelling
    }, 'Dashboard stats fetched');
  } catch (err) {
    next(err);
  }
}

export async function getSalesTrends(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const days = parseInt(req.query.days || '7', 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trends = await Sale.aggregate([
      {
        $match: {
          shopId,
          saleDate: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$saleDate',
              timezone: '+05:30' // Asia/Kolkata
            }
          },
          totalSales: { $sum: { $subtract: ['$grandTotal', { $ifNull: ['$refundTotal', 0] }] } },
          billsCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return sendSuccess(res, trends, 'Sales trends retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * Monthly GST summary: taxable value and GST collected per tax rate,
 * net of returns, with the CGST/SGST split (intra-state).
 * Month is interpreted in Asia/Kolkata. Query: ?month=YYYY-MM (default: current month).
 */
export async function getGstSummary(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const monthParam = req.query.month;

    let year;
    let monthIndex; // 0-based
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      year = parseInt(monthParam.slice(0, 4), 10);
      monthIndex = parseInt(monthParam.slice(5, 7), 10) - 1;
    } else {
      const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      year = istNow.getUTCFullYear();
      monthIndex = istNow.getUTCMonth();
    }

    // IST month boundaries expressed in UTC (IST = UTC+5:30)
    const startDate = new Date(Date.UTC(year, monthIndex, 1, -5, -30));
    const endDate = new Date(Date.UTC(monthIndex === 11 ? year + 1 : year, monthIndex === 11 ? 0 : monthIndex + 1, 1, -5, -30));

    const sales = await Sale.find({
      shopId,
      saleDate: { $gte: startDate, $lt: endDate },
      status: { $in: ['completed', 'partially_returned', 'returned'] }
    });

    const byRate = new Map();
    let totalBills = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalRefunds = 0;

    for (const sale of sales) {
      totalBills += 1;
      totalRefunds += sale.refundTotal || 0;

      const returnedQty = new Map();
      (sale.returns || []).forEach((entry) => {
        const key = entry.productId.toString();
        returnedQty.set(key, (returnedQty.get(key) || 0) + entry.quantity);
      });

      for (const item of sale.items) {
        const key = item.productId.toString();
        const netQty = item.quantity - (returnedQty.get(key) || 0);
        if (netQty <= 0) continue;
        const frac = netQty / item.quantity;
        const tax = Math.round((item.taxAmount || 0) * frac);
        const taxable = Math.round(((item.lineTotal || 0) - (item.taxAmount || 0)) * frac);
        const rate = item.taxRate || 0;
        const bucket = byRate.get(rate) || { taxRate: rate, taxableValue: 0, taxAmount: 0 };
        bucket.taxableValue += taxable;
        bucket.taxAmount += tax;
        byRate.set(rate, bucket);
        totalTaxable += taxable;
        totalTax += tax;
      }
    }

    const cgst = Math.round(totalTax / 2);
    const sgst = totalTax - cgst;

    return sendSuccess(res, {
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      totalBills,
      totalTaxable,
      totalTax,
      cgst,
      sgst,
      totalRefunds,
      rates: [...byRate.values()]
        .sort((a, b) => a.taxRate - b.taxRate)
        .map((bucket) => ({
          ...bucket,
          cgst: Math.round(bucket.taxAmount / 2),
          sgst: bucket.taxAmount - Math.round(bucket.taxAmount / 2)
        }))
    }, 'GST summary retrieved');
  } catch (err) {
    next(err);
  }
}
