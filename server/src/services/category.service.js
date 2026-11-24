import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { MASTER_CATEGORIES } from '../data/masterCategories.js';
import { classifyProduct } from './category-classifier.service.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Idempotently initialize the 33 master supermarket categories and subcategories
 */
export async function initializeMasterCategories() {
  try {
    for (const catData of MASTER_CATEGORIES) {
      const normalizedName = catData.name.trim().toLowerCase();
      const slug = catData.slug || slugify(catData.name);

      let mainCat = await Category.findOne({
        shopId: 'SYSTEM',
        $or: [{ slug }, { normalizedName }]
      });

      if (!mainCat) {
        mainCat = await Category.create({
          shopId: 'SYSTEM',
          name: catData.name,
          normalizedName,
          slug,
          parentId: null,
          parentName: '',
          icon: catData.icon || 'Layers',
          aliases: catData.aliases || [],
          externalMappings: catData.externalMappings || [],
          isSystem: true,
          isActive: true,
          displayOrder: catData.displayOrder || 0
        });
      } else {
        // Update aliases, icon & display order safely without breaking IDs
        mainCat.aliases = Array.from(new Set([...(mainCat.aliases || []), ...(catData.aliases || [])]));
        mainCat.externalMappings = Array.from(new Set([...(mainCat.externalMappings || []), ...(catData.externalMappings || [])]));
        mainCat.icon = catData.icon || mainCat.icon;
        mainCat.displayOrder = catData.displayOrder ?? mainCat.displayOrder;
        await mainCat.save();
      }

      // Initialize subcategories under this main category
      if (Array.isArray(catData.subcategories)) {
        for (const sub of catData.subcategories) {
          const subNormalized = sub.name.trim().toLowerCase();
          const subSlug = `${slug}-${sub.slug || slugify(sub.name)}`;

          let subCat = await Category.findOne({
            shopId: 'SYSTEM',
            parentId: mainCat._id,
            $or: [{ slug: subSlug }, { normalizedName: subNormalized }]
          });

          if (!subCat) {
            await Category.create({
              shopId: 'SYSTEM',
              name: sub.name,
              normalizedName: subNormalized,
              slug: subSlug,
              parentId: mainCat._id,
              parentName: mainCat.name,
              icon: mainCat.icon,
              aliases: sub.aliases || [],
              externalMappings: [],
              isSystem: true,
              isActive: true
            });
          } else {
            subCat.aliases = Array.from(new Set([...(subCat.aliases || []), ...(sub.aliases || [])]));
            await subCat.save();
          }
        }
      }
    }

    console.log('[CategoryService] Master Supermarket Categories initialized successfully.');
    await migrateExistingProducts();
  } catch (err) {
    console.error('[CategoryService Error] Failed to initialize master categories:', err.message);
  }
}

/**
 * Get all categories available for a shop (System master categories + Shop custom categories)
 * Returns hierarchical structure with product counts
 */
export async function getCategoriesForShop(shopId, options = {}) {
  const { includeInactive = false } = options;

  const query = {
    $or: [{ shopId: 'SYSTEM' }, { shopId: shopId?.toUpperCase() }]
  };

  if (!includeInactive) {
    query.isActive = true;
  }

  const allCategories = await Category.find(query).sort({ displayOrder: 1, name: 1 }).lean();

  // Aggregate product counts per category for this shop
  let productCounts = {};
  let subProductCounts = {};
  if (shopId) {
    const counts = await Product.aggregate([
      { $match: { shopId: shopId.toUpperCase(), isActive: true } },
      { $group: { _id: { cat: '$category', sub: '$subCategory' }, count: { $sum: 1 } } }
    ]);

    counts.forEach(c => {
      const catName = c._id.cat;
      const subName = c._id.sub;
      if (catName) {
        productCounts[catName] = (productCounts[catName] || 0) + c.count;
      }
      if (subName) {
        subProductCounts[subName] = (subProductCounts[subName] || 0) + c.count;
      }
    });
  }

  // Count uncategorized products (in 'Others' or pending classification)
  let uncategorizedCount = 0;
  if (shopId) {
    uncategorizedCount = await Product.countDocuments({
      shopId: shopId.toUpperCase(),
      isActive: true,
      $or: [
        { category: 'Others' },
        { classificationStatus: 'pending_classification' }
      ]
    });
  }

  // Separate main categories and subcategories
  const mainCategories = allCategories.filter(c => !c.parentId);
  const subCategoryMap = {};

  allCategories.filter(c => c.parentId).forEach(sub => {
    const parentIdStr = sub.parentId.toString();
    if (!subCategoryMap[parentIdStr]) {
      subCategoryMap[parentIdStr] = [];
    }
    sub.productCount = subProductCounts[sub.name] || 0;
    subCategoryMap[parentIdStr].push(sub);
  });

  const structured = mainCategories.map(main => ({
    ...main,
    productCount: productCounts[main.name] || 0,
    subcategories: subCategoryMap[main._id.toString()] || []
  }));

  return {
    categories: structured,
    mainCategories,
    allCategories,
    tree: structured,
    totalMain: mainCategories.length,
    uncategorizedCount
  };
}

/**
 * Create a shop-specific custom category or subcategory
 */
export async function createShopCategory(shopId, data) {
  const { name, parentId: initialParentId = null, parentName: initialParentName = '', icon = 'Layers', aliases = [] } = data;
  if (!name || !name.trim()) {
    throw new Error('Category name is required');
  }

  const cleanName = name.trim();
  const normalizedName = cleanName.toLowerCase();
  const shopUpper = shopId.toUpperCase();
  const slug = `${shopUpper.toLowerCase()}-${slugify(cleanName)}`;

  // Check if parent category exists
  let parentId = initialParentId;
  let parentName = initialParentName;

  if (parentId) {
    const parent = await Category.findById(parentId);
    if (!parent) {
      throw new Error('Parent category not found');
    }
    parentName = parent.name;
  } else if (parentName && parentName.trim()) {
    const parent = await Category.findOne({
      $or: [
        { shopId: 'SYSTEM', name: new RegExp(`^${parentName.trim()}$`, 'i') },
        { shopId: shopUpper, name: new RegExp(`^${parentName.trim()}$`, 'i') }
      ],
      isActive: true
    });
    if (parent) {
      parentId = parent._id;
      parentName = parent.name;
    }
  }

  // Check for duplicate in this shop
  const existing = await Category.findOne({
    shopId: shopUpper,
    $or: [{ slug }, { normalizedName, parentId }]
  });

  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      existing.name = cleanName;
      await existing.save();
      return existing;
    }
    throw new Error(`Category '${cleanName}' already exists in your store`);
  }

  const category = await Category.create({
    shopId: shopUpper,
    name: cleanName,
    normalizedName,
    slug,
    parentId,
    parentName,
    icon,
    aliases: aliases.map(a => a.trim().toLowerCase()).filter(Boolean),
    isSystem: false,
    isActive: true
  });

  return category;
}

/**
 * Update an existing category
 */
export async function updateShopCategory(shopId, categoryId, updates) {
  const shopUpper = shopId.toUpperCase();
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  // System categories can only have their active state or aliases toggled by a shop
  if (category.isSystem) {
    if (updates.isActive !== undefined) {
      // Toggle for system category
      category.isActive = updates.isActive;
      await category.save();
    }
    return category;
  }

  // Custom category: verify ownership
  if (category.shopId !== shopUpper) {
    throw new Error('Access denied. Cannot modify category belonging to another shop.');
  }

  const oldName = category.name;
  if (updates.name && updates.name.trim() !== oldName) {
    const newName = updates.name.trim();
    category.name = newName;
    category.normalizedName = newName.toLowerCase();
    category.slug = `${shopUpper.toLowerCase()}-${slugify(newName)}`;

    // Sync products referencing oldName
    if (!category.parentId) {
      await Product.updateMany(
        { shopId: shopUpper, category: oldName },
        { $set: { category: newName } }
      );
    } else {
      await Product.updateMany(
        { shopId: shopUpper, subCategory: oldName },
        { $set: { subCategory: newName } }
      );
    }
  }

  if (updates.icon) category.icon = updates.icon;
  if (updates.isActive !== undefined) category.isActive = updates.isActive;
  if (Array.isArray(updates.aliases)) {
    category.aliases = updates.aliases.map(a => a.trim().toLowerCase()).filter(Boolean);
  }

  await category.save();
  return category;
}

/**
 * Delete / Archive category with safe reassignment
 */
export async function deleteShopCategory(shopId, categoryId, reassignToCategory = 'Others') {
  const shopUpper = shopId.toUpperCase();
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  if (category.isSystem) {
    throw new Error('System master categories cannot be deleted. You can deactivate them instead.');
  }

  if (category.shopId !== shopUpper) {
    throw new Error('Access denied');
  }

  // Reassign any products in this category before deleting
  const isMain = !category.parentId;
  if (isMain) {
    await Product.updateMany(
      { shopId: shopUpper, category: category.name },
      { $set: { category: reassignToCategory, subCategory: 'General Others', classificationStatus: 'pending_classification' } }
    );
  } else {
    await Product.updateMany(
      { shopId: shopUpper, subCategory: category.name },
      { $set: { subCategory: 'General Others' } }
    );
  }

  await Category.deleteOne({ _id: category._id });
  return { success: true, message: `Category '${category.name}' removed and products moved to '${reassignToCategory}'` };
}

/**
 * Merge categories and move products
 */
export async function mergeCategories(shopId, sourceIdentifier, targetIdentifier, targetSubCategoryName = '') {
  const shopUpper = shopId.toUpperCase();

  let sourceCategoryName = sourceIdentifier;
  let targetCategoryName = targetIdentifier;
  let sourceCatDoc = null;
  let targetCatDoc = null;

  if (mongoose.Types.ObjectId.isValid(sourceIdentifier)) {
    sourceCatDoc = await Category.findById(sourceIdentifier);
    if (sourceCatDoc) sourceCategoryName = sourceCatDoc.name;
  }
  if (mongoose.Types.ObjectId.isValid(targetIdentifier)) {
    targetCatDoc = await Category.findById(targetIdentifier);
    if (targetCatDoc) targetCategoryName = targetCatDoc.name;
  }

  const updateFields = {
    category: targetCategoryName
  };
  if (targetSubCategoryName) {
    updateFields.subCategory = targetSubCategoryName;
  }
  if (targetCatDoc) {
    updateFields.categoryId = targetCatDoc.parentId || targetCatDoc._id;
    if (targetCatDoc.parentId) {
      updateFields.subCategoryId = targetCatDoc._id;
    }
  }

  const query = {
    shopId: shopUpper,
    $or: [
      { category: sourceCategoryName },
      ...(sourceCatDoc ? [{ categoryId: sourceCatDoc._id }, { subCategoryId: sourceCatDoc._id }] : [])
    ]
  };

  const result = await Product.updateMany(query, { $set: updateFields });

  if (sourceCatDoc && !sourceCatDoc.isSystem) {
    sourceCatDoc.isActive = false;
    await sourceCatDoc.save();
  }

  return {
    success: true,
    modifiedCount: result.modifiedCount,
    reassignedProductsCount: result.modifiedCount,
    message: `Merged ${result.modifiedCount} products from '${sourceCategoryName}' into '${targetCategoryName}'`
  };
}

/**
 * Bulk reassign products
 */
export async function bulkReassignProducts(shopId, productIds, targetCategory, targetSubCategory = 'General Others') {
  const shopUpper = shopId.toUpperCase();

  const result = await Product.updateMany(
    { shopId: shopUpper, _id: { $in: productIds } },
    {
      $set: {
        category: targetCategory,
        subCategory: targetSubCategory,
        classificationStatus: 'manual'
      }
    }
  );

  return {
    success: true,
    modifiedCount: result.modifiedCount
  };
}

/**
 * Safe migration for existing products with legacy category names
 */
export async function migrateExistingProducts() {
  try {
    const products = await Product.find({
      $or: [
        { category: { $in: ['General', 'Groceries', 'Grocery', 'Grains', 'Edible Oils', 'Dairy', 'Instant Food', 'Household', 'Spices', 'Snacks & Biscuits', 'Plant based foods and beverages'] } },
        { subCategory: { $in: ['', null, undefined] } }
      ]
    });

    let migrated = 0;
    for (const p of products) {
      const classification = await classifyProduct({
        name: p.name,
        brand: p.brand,
        rawCategory: p.category
      });

      p.category = classification.category;
      p.subCategory = classification.subCategory || 'General Others';
      p.classificationStatus = 'auto_assigned';
      await p.save();
      migrated++;
    }

    if (migrated > 0) {
      console.log(`[CategoryService] Migrated ${migrated} products to standardized master categories.`);
    }
    return { success: true, count: migrated };
  } catch (err) {
    console.warn('[CategoryService] Product migration warning:', err.message);
    return { success: false, error: err.message };
  }
}

