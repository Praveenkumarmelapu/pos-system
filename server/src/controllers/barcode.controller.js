import { BarcodeRegistry } from '../models/BarcodeRegistry.js';
import { Product } from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Generate a unique, scannable Code 128 internal barcode for a tenant shop.
 * Format: INT + 4-char Shop Suffix + 6-digit Unix timestamp + 2-digit random checksum
 * E.g., INTI4X87920145
 */
export async function generateUniqueBarcode(shopId) {
  const shopSuffix = shopId.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString().slice(-6);
    const rand = Math.floor(10 + Math.random() * 90);
    const candidate = `INT${shopSuffix}${timestamp}${rand}`;

    // Verify uniqueness in both Product and BarcodeRegistry for this tenant
    const [existingProduct, existingRegistry] = await Promise.all([
      Product.findOne({ shopId, barcode: candidate }),
      BarcodeRegistry.findOne({ shopId, barcodeValue: candidate })
    ]);

    if (!existingProduct && !existingRegistry) {
      return candidate;
    }
    attempts++;
  }

  // Fallback with high-entropy random sequence
  return `INT${shopSuffix}${Math.floor(10000000 + Math.random() * 90000000)}`;
}

export async function generateBarcode(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { productId, labelPreset = '50x30mm' } = req.body;

    const barcodeValue = await generateUniqueBarcode(shopId);

    let product = null;
    if (productId) {
      product = await Product.findOne({ _id: productId, shopId });
      if (product) {
        product.barcode = barcodeValue;
        product.isSystemBarcode = true;
        await product.save();
      }
    }

    const registryEntry = await BarcodeRegistry.create({
      shopId,
      productId: product ? product._id : null,
      barcodeValue,
      barcodeType: 'CODE128',
      barcodeSource: 'system_generated',
      labelPreset
    });

    return sendSuccess(res, {
      barcode: barcodeValue,
      barcodeType: 'CODE128',
      registryId: registryEntry._id,
      product: product ? { _id: product._id, name: product.name, barcode: product.barcode } : null
    }, 'Internal Code 128 barcode generated successfully', 201);
  } catch (err) {
    next(err);
  }
}

export async function bulkGenerateBarcodes(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { productIds = [], labelPreset = '50x30mm' } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return sendError(res, 'Please provide an array of product IDs to generate barcodes for', 400);
    }

    const products = await Product.find({ _id: { $in: productIds }, shopId, isActive: true });
    const results = [];

    for (const prod of products) {
      const barcodeValue = await generateUniqueBarcode(shopId);
      prod.barcode = barcodeValue;
      prod.isSystemBarcode = true;
      await prod.save();

      const entry = await BarcodeRegistry.create({
        shopId,
        productId: prod._id,
        barcodeValue,
        barcodeType: 'CODE128',
        barcodeSource: 'system_generated',
        labelPreset
      });

      results.push({
        productId: prod._id,
        name: prod.name,
        barcode: barcodeValue,
        registryId: entry._id
      });
    }

    return sendSuccess(res, results, `Generated internal barcodes for ${results.length} products`);
  } catch (err) {
    next(err);
  }
}

export async function recordPrint(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { barcodeValue, copies = 1 } = req.body;

    if (!barcodeValue) {
      return sendError(res, 'barcodeValue is required', 400);
    }

    const entry = await BarcodeRegistry.findOneAndUpdate(
      { shopId, barcodeValue },
      { $inc: { printCount: copies } },
      { new: true, upsert: true }
    );

    return sendSuccess(res, entry, 'Print count recorded');
  } catch (err) {
    next(err);
  }
}

export async function getBarcodeRegistry(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [entries, total] = await Promise.all([
      BarcodeRegistry.find({ shopId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate('productId', 'name sellingPrice unit packSize category imageUrl'),
      BarcodeRegistry.countDocuments({ shopId })
    ]);

    return sendSuccess(res, entries, 'Barcode registry retrieved', 200, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total
    });
  } catch (err) {
    next(err);
  }
}
