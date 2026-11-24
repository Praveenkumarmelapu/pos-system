import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { Sale } from '../models/Sale.js';
import { BarcodeRegistry } from '../models/BarcodeRegistry.js';
import { lookupBarcode } from '../services/barcode.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { rupeesToPaise } from '../utils/money.js';
import { createProductSchema, updateProductSchema } from '../validators/product.validator.js';

export async function getProducts(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { search, category, status, page = 1, limit = 50 } = req.query;

    const query = { shopId, isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status === 'low_stock') {
      query.$expr = { $lte: ['$stockQuantity', '$minStockThreshold'] };
    } else if (status === 'out_of_stock') {
      query.stockQuantity = { $lte: 0 };
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Product.countDocuments(query)
    ]);

    return sendSuccess(res, products, 'Products fetched', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = req.tenant.shopId;

    const product = await Product.findOne({ _id: id, shopId });
    if (!product) {
      return sendError(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Parallel fetch of audit trail and sales history for this product
    const [recentMovements, recentSales, barcodeInfo] = await Promise.all([
      StockMovement.find({ shopId, productId: product._id })
        .sort({ createdAt: -1 })
        .limit(25)
        .populate('performedBy', 'name email role'),
      Sale.find({ shopId, 'items.productId': product._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('invoiceNumber customerName items grandTotal paymentMethod createdAt'),
      BarcodeRegistry.findOne({ shopId, barcodeValue: product.barcode })
    ]);

    // Calculate product sales analytics
    let totalUnitsSold = 0;
    let totalRevenuePaise = 0;

    recentSales.forEach(s => {
      const line = s.items.find(i => i.productId.toString() === product._id.toString());
      if (line) {
        totalUnitsSold += line.quantity;
        totalRevenuePaise += line.lineTotal;
      }
    });

    return sendSuccess(res, {
      product,
      recentMovements,
      recentSales,
      barcodeInfo: barcodeInfo || {
        barcodeValue: product.barcode,
        barcodeType: 'CODE128',
        printCount: 0,
        labelPreset: '50x30mm'
      },
      analytics: {
        totalUnitsSold,
        totalRevenuePaise
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const validated = createProductSchema.parse(req.body);

    // Prevent duplicate barcode in same shop
    const existing = await Product.findOne({ shopId, barcode: validated.barcode });
    if (existing) {
      if (existing.isActive) {
        return sendError(res, `A product with barcode '${validated.barcode}' already exists in your inventory.`, 409, 'DUPLICATE_BARCODE');
      } else {
        // Re-activate previously archived product
        existing.isActive = true;
        existing.name = validated.name;
        existing.sellingPrice = rupeesToPaise(validated.sellingPrice);
        existing.purchasePrice = rupeesToPaise(validated.purchasePrice);
        existing.stockQuantity = validated.stockQuantity;
        await existing.save();
        return sendSuccess(res, existing, 'Archived product re-activated and updated', 200);
      }
    }

    const purchasePricePaise = rupeesToPaise(validated.purchasePrice);
    const sellingPricePaise = rupeesToPaise(validated.sellingPrice);
    const mrpPaise = validated.mrp ? rupeesToPaise(validated.mrp) : sellingPricePaise;

    const product = await Product.create({
      shopId,
      barcode: validated.barcode,
      name: validated.name,
      brand: validated.brand || '',
      category: validated.category || 'Others',
      subCategory: validated.subCategory || 'General Others',
      categoryId: validated.categoryId || null,
      subCategoryId: validated.subCategoryId || null,
      classificationStatus: validated.classificationStatus || 'auto_assigned',
      description: validated.description || '',
      imageUrl: validated.imageUrl || '',
      purchasePrice: purchasePricePaise,
      sellingPrice: sellingPricePaise,
      mrp: mrpPaise,
      taxRate: validated.taxRate || 0,
      stockQuantity: validated.stockQuantity || 0,
      minStockThreshold: validated.minStockThreshold ?? req.tenant.settings?.lowStockThresholdDefault ?? 5,
      unit: validated.unit || 'pcs',
      packSize: validated.packSize || '',
      isActive: true
    });

    // Record Opening Stock Movement
    if (validated.stockQuantity > 0) {
      await StockMovement.create({
        shopId,
        productId: product._id,
        barcode: product.barcode,
        type: 'opening_stock',
        quantityDelta: validated.stockQuantity,
        previousStock: 0,
        newStock: validated.stockQuantity,
        reason: 'Initial opening stock',
        performedBy: req.user._id
      });
    }

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk import of a shop's price list (CSV import on the client sends parsed rows).
 * New barcodes are created; existing barcodes get name/price/stock refreshed.
 * Max 500 rows per request.
 */
export async function bulkImportProducts(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : [];
    if (!items.length) {
      return sendError(res, 'No items to import', 400);
    }

    let created = 0;
    let updated = 0;
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      try {
        const validated = createProductSchema.parse({
          purchasePrice: 0,
          ...row
        });

        const existing = await Product.findOne({ shopId, barcode: validated.barcode });
        if (existing) {
          existing.isActive = true;
          existing.name = validated.name;
          existing.brand = validated.brand || existing.brand;
          existing.category = validated.category || existing.category;
          existing.subCategory = validated.subCategory || existing.subCategory;
          existing.sellingPrice = rupeesToPaise(validated.sellingPrice);
          existing.purchasePrice = rupeesToPaise(validated.purchasePrice);
          existing.mrp = validated.mrp ? rupeesToPaise(validated.mrp) : rupeesToPaise(validated.sellingPrice);
          existing.stockQuantity = validated.stockQuantity;
          existing.unit = validated.unit || existing.unit;
          existing.packSize = validated.packSize || existing.packSize;
          await existing.save();
          updated++;
          continue;
        }

        const sellingPricePaise = rupeesToPaise(validated.sellingPrice);
        await Product.create({
          shopId,
          barcode: validated.barcode,
          name: validated.name,
          brand: validated.brand || '',
          category: validated.category || 'Others',
          subCategory: validated.subCategory || 'General Others',
          classificationStatus: 'manual',
          description: validated.description || '',
          imageUrl: validated.imageUrl || '',
          purchasePrice: rupeesToPaise(validated.purchasePrice),
          sellingPrice: sellingPricePaise,
          mrp: validated.mrp ? rupeesToPaise(validated.mrp) : sellingPricePaise,
          taxRate: validated.taxRate || 0,
          stockQuantity: validated.stockQuantity || 0,
          minStockThreshold: validated.minStockThreshold ?? 5,
          unit: validated.unit || 'pcs',
          packSize: validated.packSize || '',
          isActive: true
        });
        created++;
      } catch (rowErr) {
        errors.push({ row: i + 1, barcode: String(row?.barcode || ''), reason: rowErr?.issues?.[0]?.message || rowErr.message });
      }
    }

    return sendSuccess(res, {
      created,
      updated,
      failed: errors.length,
      errors: errors.slice(0, 20)
    }, `Import finished: ${created} created, ${updated} updated, ${errors.length} failed`);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = req.tenant.shopId;
    const validated = updateProductSchema.parse(req.body);

    const product = await Product.findOne({ _id: id, shopId });
    if (!product) {
      return sendError(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    if (validated.sellingPrice !== undefined) product.sellingPrice = rupeesToPaise(validated.sellingPrice);
    if (validated.purchasePrice !== undefined) product.purchasePrice = rupeesToPaise(validated.purchasePrice);
    if (validated.mrp !== undefined) product.mrp = rupeesToPaise(validated.mrp);
    if (validated.name !== undefined) product.name = validated.name;
    if (validated.brand !== undefined) product.brand = validated.brand;
    if (validated.category !== undefined) product.category = validated.category;
    if (validated.subCategory !== undefined) product.subCategory = validated.subCategory;
    if (validated.categoryId !== undefined) product.categoryId = validated.categoryId;
    if (validated.subCategoryId !== undefined) product.subCategoryId = validated.subCategoryId;
    if (validated.classificationStatus !== undefined) product.classificationStatus = validated.classificationStatus;
    if (validated.description !== undefined) product.description = validated.description;
    if (validated.imageUrl !== undefined) product.imageUrl = validated.imageUrl;
    if (validated.taxRate !== undefined) product.taxRate = validated.taxRate;
    if (validated.minStockThreshold !== undefined) product.minStockThreshold = validated.minStockThreshold;
    if (validated.unit !== undefined) product.unit = validated.unit;
    if (validated.packSize !== undefined) product.packSize = validated.packSize;

    await product.save();
    return sendSuccess(res, product, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const shopId = req.tenant.shopId;

    // Soft delete / archive to protect historical sales integrity
    const product = await Product.findOneAndUpdate(
      { _id: id, shopId },
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return sendError(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    return sendSuccess(res, null, 'Product archived successfully');
  } catch (err) {
    next(err);
  }
}

export async function lookupProductByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    const shopId = req.tenant ? req.tenant.shopId : null;

    const result = await lookupBarcode(shopId, barcode);
    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function generateInternalBarcode(req, res) {
  const shopId = req.tenant.shopId;
  const timestamp = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  const code = `INT${timestamp}${rand}`;
  return sendSuccess(res, { barcode: code });
}
