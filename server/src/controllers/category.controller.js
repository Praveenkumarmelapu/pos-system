import {
  getCategoriesForShop,
  createShopCategory,
  updateShopCategory,
  deleteShopCategory,
  mergeCategories,
  bulkReassignProducts
} from '../services/category.service.js';
import { classifyProduct } from '../services/category-classifier.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export async function getCategories(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { includeInactive = 'false' } = req.query;
    const result = await getCategoriesForShop(shopId, {
      includeInactive: includeInactive === 'true'
    });
    return sendSuccess(res, result, 'Categories fetched successfully');
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const category = await createShopCategory(shopId, req.body);
    return sendSuccess(res, category, 'Category created successfully', 201);
  } catch (err) {
    if (err.message.includes('already exists')) {
      return sendError(res, err.message, 409);
    }
    next(err);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { id } = req.params;
    const updated = await updateShopCategory(shopId, id, req.body);
    return sendSuccess(res, updated, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { id } = req.params;
    const { reassignTo = 'Others' } = req.query;
    const result = await deleteShopCategory(shopId, id, reassignTo);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('cannot be deleted')) {
      return sendError(res, err.message, 400);
    }
    next(err);
  }
}

export async function mergeCategoriesHandler(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { sourceCategory, targetCategory, targetSubCategory, sourceCategoryId, targetCategoryId } = req.body;
    const src = sourceCategory || sourceCategoryId;
    const tgt = targetCategory || targetCategoryId;
    if (!src || !tgt) {
      return sendError(res, 'Source and target categories are required for merge', 400);
    }

    const result = await mergeCategories(shopId, src, tgt, targetSubCategory);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    next(err);
  }
}

export async function bulkReassignHandler(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { productIds, targetCategory, targetSubCategory } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0 || !targetCategory) {
      return sendError(res, 'Product IDs and target category are required', 400);
    }

    const result = await bulkReassignProducts(shopId, productIds, targetCategory, targetSubCategory);
    return sendSuccess(res, result, `Reassigned ${result.modifiedCount} products to ${targetCategory}`);
  } catch (err) {
    next(err);
  }
}

export async function suggestCategoryHandler(req, res, next) {
  try {
    const shopId = req.tenant.shopId;
    const { query = '', brand = '', rawCategory = '' } = req.query;

    const classification = await classifyProduct({
      name: query,
      brand,
      rawCategory,
      shopId
    });

    return sendSuccess(res, classification, 'Category suggestion calculated');
  } catch (err) {
    next(err);
  }
}
