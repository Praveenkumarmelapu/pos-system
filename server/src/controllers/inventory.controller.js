import { StockMovement } from '../models/StockMovement.js';
import { Product } from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { rupeesToPaise } from '../utils/money.js';
import { stockAdjustmentSchema, createPurchaseSchema } from '../validators/inventory.validator.js';

export async function getStockMovements(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { productId, type, page = 1, limit = 50 } = req.query;

    const query = { shopId };
    if (productId) query.productId = productId;
    if (type) query.type = type;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('performedBy', 'name email'),
      StockMovement.countDocuments(query)
    ]);

    return sendSuccess(res, movements, 'Stock movements retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const validated = stockAdjustmentSchema.parse(req.body);

    const product = await Product.findOne({ _id: validated.productId, shopId });
    if (!product) {
      return sendError(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    const previousStock = product.stockQuantity;
    const newStock = previousStock + validated.quantityDelta;

    if (newStock < 0 && !req.tenant.settings?.allowNegativeStock) {
      return sendError(res, 'Stock adjustment would result in negative stock.', 400, 'NEGATIVE_STOCK_DISALLOWED');
    }

    product.stockQuantity = newStock;
    await product.save();

    const movement = await StockMovement.create({
      shopId,
      productId: product._id,
      barcode: product.barcode,
      type: validated.type,
      quantityDelta: validated.quantityDelta,
      previousStock,
      newStock,
      reason: validated.reason,
      performedBy: req.user._id
    });

    return sendSuccess(res, { product, movement }, 'Stock adjusted successfully');
  } catch (err) {
    next(err);
  }
}

export async function createPurchase(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const validated = createPurchaseSchema.parse(req.body);

    const updatedProducts = [];

    for (const item of validated.items) {
      const product = await Product.findOne({ _id: item.productId, shopId });
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = previousStock + item.quantityReceived;

      // Update purchase rate if provided
      if (item.purchaseRate > 0) {
        product.purchasePrice = rupeesToPaise(item.purchaseRate);
      }
      product.stockQuantity = newStock;
      await product.save();

      await StockMovement.create({
        shopId,
        productId: product._id,
        barcode: product.barcode,
        type: 'purchase',
        quantityDelta: item.quantityReceived,
        previousStock,
        newStock,
        referenceId: validated.purchaseInvoiceNumber || 'PURCHASE',
        reason: `Purchase from ${validated.supplierName}`,
        performedBy: req.user._id
      });

      updatedProducts.push(product);
    }

    return sendSuccess(res, updatedProducts, 'Inward purchase recorded and stock replenished', 201);
  } catch (err) {
    next(err);
  }
}
