import axios from 'axios';
import { Product } from '../models/Product.js';
import { MasterProduct } from '../models/MasterProduct.js';
import { config } from '../config/env.js';
import { classifyProduct } from './category-classifier.service.js';

/**
 * Built-in Indian FMCG barcode suggestions
 * Catalog prices should be confirmed against the package
 */
const INDIAN_FMCG_CATALOG = {
  '8901030383701': { name: 'Tata Salt Vacuum Evaporated 1kg', brand: 'Tata', category: 'Groceries', packSize: '1 kg', unit: 'kg', mrp: 2800, imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=80' },
  '8906009077574': { name: 'Unibic Cookie Celebrations Assorted Cookies Gift Pack 637.5g', brand: 'Unibic', category: 'Snacks & Biscuits', packSize: '637.5 g', unit: 'box', mrp: 70000, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8906009070018': { name: 'Unibic Choco Chip Cookies 75g', brand: 'Unibic', category: 'Snacks & Biscuits', packSize: '75 g', unit: 'pcs', mrp: 3500, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8906009070117': { name: 'Unibic Butter Cookies 75g', brand: 'Unibic', category: 'Snacks & Biscuits', packSize: '75 g', unit: 'pcs', mrp: 3500, imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80' },
  '8906009070216': { name: 'Unibic Fruit & Nut Cookies 75g', brand: 'Unibic', category: 'Snacks & Biscuits', packSize: '75 g', unit: 'pcs', mrp: 4000, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8901058852234': { name: 'Maggi 2-Minute Masala Noodles 70g', brand: 'Nestle', category: 'Instant Food', packSize: '70 g', unit: 'pcs', mrp: 1400, imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=80' },
  '8901725181222': { name: 'Aashirvaad Superior MP Sharbati Atta 5kg', brand: 'ITC Aashirvaad', category: 'Groceries', packSize: '5 kg', unit: 'kg', mrp: 29500, imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80' },
  '8901491101833': { name: 'Amul Butter Pasteurized 100g', brand: 'Amul', category: 'Dairy', packSize: '100 g', unit: 'pcs', mrp: 5800, imageUrl: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=80' },
  '8901030004569': { name: 'Surf Excel Quick Wash Detergent 1kg', brand: 'Surf Excel', category: 'Household', packSize: '1 kg', unit: 'kg', mrp: 14500, imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80' },
  '8901207010118': { name: 'Dettol Original Germ Protection Soap 75g', brand: 'Dettol', category: 'Personal Care', packSize: '75 g', unit: 'pcs', mrp: 4000, imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&auto=format&fit=crop&q=80' },
  '8901725121112': { name: 'Sunfeast Dark Fantasy Choco Fills 75g', brand: 'Sunfeast', category: 'Snacks & Biscuits', packSize: '75 g', unit: 'pcs', mrp: 3500, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8901030654321': { name: 'Parle-G Gold Glucose Biscuits 250g', brand: 'Parle', category: 'Snacks & Biscuits', packSize: '250 g', unit: 'pcs', mrp: 2000, imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80' },
  '8901030825000': { name: 'Brooke Bond Red Label Tea 500g', brand: 'Brooke Bond', category: 'Beverages', packSize: '500 g', unit: 'pcs', mrp: 27000, imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80' },
  '8906007280011': { name: 'Fortune Sunlite Refined Sunflower Oil 1L', brand: 'Fortune', category: 'Edible Oils', packSize: '1 L', unit: 'l', mrp: 15500, imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80' },
  '8901058000451': { name: 'Nescafe Classic Instant Coffee 50g', brand: 'Nescafe', category: 'Beverages', packSize: '50 g', unit: 'pcs', mrp: 18500, imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80' },
  '8901499008141': { name: "Lays India's Magic Masala Potato Chips 50g", brand: 'Lays', category: 'Snacks & Biscuits', packSize: '50 g', unit: 'pcs', mrp: 2000, imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80' },
  '8901499008134': { name: 'Kurkure Masala Munch 85g', brand: 'Kurkure', category: 'Snacks & Biscuits', packSize: '85 g', unit: 'pcs', mrp: 2000, imageUrl: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=500&auto=format&fit=crop&q=80' },
  '8901233024509': { name: 'Britannia Good Day Butter Cookies 120g', brand: 'Britannia', category: 'Snacks & Biscuits', packSize: '120 g', unit: 'pcs', mrp: 3000, imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80' },
  '8901233012308': { name: 'Britannia Marie Gold Biscuits 250g', brand: 'Britannia', category: 'Snacks & Biscuits', packSize: '250 g', unit: 'pcs', mrp: 3500, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8901058862219': { name: 'KitKat 4 Finger Crisp Wafer Bar 38g', brand: 'Nestle', category: 'Snacks & Biscuits', packSize: '38 g', unit: 'pcs', mrp: 3000, imageUrl: 'https://images.unsplash.com/photo-1620803009486-9a259c636f1c?w=500&auto=format&fit=crop&q=80' },
  '8901262010047': { name: 'Amul Taaza Homogenised Toned Milk 500ml', brand: 'Amul', category: 'Dairy', packSize: '500 ml', unit: 'pcs', mrp: 2700, imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80' },
  '8901030372996': { name: 'Kissan Fresh Tomato Ketchup 500g', brand: 'Kissan', category: 'Spices', packSize: '500 g', unit: 'pcs', mrp: 12000, imageUrl: 'https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=500&auto=format&fit=crop&q=80' },
  '8901314010526': { name: 'Colgate Strong Teeth Dental Cream 200g', brand: 'Colgate', category: 'Personal Care', packSize: '200 g', unit: 'pcs', mrp: 11000, imageUrl: 'https://images.unsplash.com/photo-1559563458-527698bf5295?w=500&auto=format&fit=crop&q=80' },
  '8901030704415': { name: 'Vim Dishwash Gel Lemon 250ml', brand: 'Vim', category: 'Household', packSize: '250 ml', unit: 'pcs', mrp: 6000, imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80' },
  '8901030362843': { name: 'Lifebuoy Total Germ Protection Soap 100g', brand: 'Lifebuoy', category: 'Personal Care', packSize: '100 g', unit: 'pcs', mrp: 3600, imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&auto=format&fit=crop&q=80' },
  '8901719101038': { name: 'Parle Hide & Seek Chocolate Chip Biscuits 82g', brand: 'Parle', category: 'Snacks & Biscuits', packSize: '82 g', unit: 'pcs', mrp: 3000, imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80' },
  '8901725132002': { name: 'Bingo Mad Angles Achaari Masti 66g', brand: 'Bingo', category: 'Snacks & Biscuits', packSize: '66 g', unit: 'pcs', mrp: 2000, imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80' },
  '8901030765430': { name: "Haldiram's Nagpur Bhujia Sev 200g", brand: "Haldiram's", category: 'Snacks & Biscuits', packSize: '200 g', unit: 'pcs', mrp: 6500, imageUrl: 'https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=500&auto=format&fit=crop&q=80' },
  '8902080000018': { name: 'Thums Up Charged Carbonated Drink 300ml Can', brand: 'Thums Up', category: 'Beverages', packSize: '300 ml', unit: 'pcs', mrp: 4000, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80' },
  '8902080000025': { name: 'Coca-Cola Original Taste 300ml Can', brand: 'Coca-Cola', category: 'Beverages', packSize: '300 ml', unit: 'pcs', mrp: 4000, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80' },
  '8902080000032': { name: 'Sprite Lemon-Lime Soda 300ml Can', brand: 'Sprite', category: 'Beverages', packSize: '300 ml', unit: 'pcs', mrp: 4000, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80' }
};

/**
 * Extracts price in integer Paise from text or metadata
 */
function parsePriceFromText(text) {
  if (!text) return null;
  // Match patterns like "Rs 10", "Rs. 20.00", "₹50", "MRP: 100"
  const match = text.match(/(?:Rs\.?|₹|MRP\s*:?)\s*(\d+(?:\.\d+)?)/i);
  if (match && match[1]) {
    const num = parseFloat(match[1]);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 100);
    }
  }
  return null;
}

/**
 * Smart Barcode Lookup Service
 * Tier 1: Current Shop Inventory (by shopId + barcode)
 * Tier 2: Platform Master Catalog Database
 * Tier 3: Built-in Indian FMCG catalog suggestions
 * Tier 4: External Catalog (Open Food Facts API) with text price extraction
 */
export async function lookupBarcode(shopId, barcode) {
  const cleanBarcode = String(barcode).trim();

  const alternatives = /^\d{12,14}$/.test(cleanBarcode)
    ? [...new Set([cleanBarcode, cleanBarcode.replace(/^0+(?=\d{12}$)/, ''), cleanBarcode.padStart(13, '0'), cleanBarcode.padStart(14, '0')])]
    : [cleanBarcode];

  // Tier 1: Check Active Shop Inventory
  if (shopId) {
    const shopProduct = await Product.findOne({ shopId, barcode: { $in: alternatives }, isActive: true });
    if (shopProduct) {
      return {
        found: true,
        source: 'shop_inventory',
        lookupStatus: 'complete',
        matchType: 'complete',
        currency: 'INR',
        product: {
          _id: shopProduct._id,
          barcode: shopProduct.barcode,
          name: shopProduct.name,
          brand: shopProduct.brand,
          category: shopProduct.category,
          description: shopProduct.description,
          imageUrl: shopProduct.imageUrl,
          purchasePrice: shopProduct.purchasePrice,
          sellingPrice: shopProduct.sellingPrice,
          mrp: shopProduct.mrp || shopProduct.sellingPrice,
          taxRate: shopProduct.taxRate,
          stockQuantity: shopProduct.stockQuantity,
          minStockThreshold: shopProduct.minStockThreshold,
          unit: shopProduct.unit,
          packSize: shopProduct.packSize,
          priceDetected: true,
          suggestedSellingPrice: shopProduct.sellingPrice,
          suggestedPurchasePrice: shopProduct.purchasePrice,
          isNewToShop: false
        }
      };
    }
  }

  // Tier 2: Check Platform Master Catalog Database
  const masterProduct = await MasterProduct.findOne({ barcode: { $in: alternatives } });
  if (masterProduct && (masterProduct.verified || !Object.hasOwn(INDIAN_FMCG_CATALOG, cleanBarcode))) {
    const detectedMrp = masterProduct.verified ? masterProduct.mrp || 0 : 0;
    const classification = await classifyProduct({
      name: masterProduct.name,
      brand: masterProduct.brand,
      rawCategory: masterProduct.category,
      shopId
    });

    return {
      found: true,
      source: 'master_catalog',
      lookupStatus: detectedMrp ? 'complete' : 'partial',
      matchType: detectedMrp ? 'complete' : 'partial',
      currency: 'INR',
      product: {
        barcode: masterProduct.barcode,
        name: masterProduct.name,
        brand: masterProduct.brand,
        category: classification.category,
        subCategory: masterProduct.subCategory || classification.subCategory,
        classificationStatus: classification.classificationStatus,
        classificationConfidence: classification.confidence,
        packSize: masterProduct.packSize,
        unit: masterProduct.unit || 'pcs',
        imageUrl: masterProduct.imageUrl || null,
        mrp: detectedMrp || null,
        sellingPrice: detectedMrp || null,
        purchasePrice: null,
        suggestedSellingPrice: detectedMrp || null,
        suggestedPurchasePrice: null,
        priceDetected: detectedMrp > 0,
        isNewToShop: true
      }
    };
  }

  // Tier 3: Check Built-in Instant Indian FMCG Catalog
  const item = alternatives.map(code => Object.hasOwn(INDIAN_FMCG_CATALOG, code) && INDIAN_FMCG_CATALOG[code]).find(Boolean);
  if (item) {
    const classification = await classifyProduct({
      name: item.name,
      brand: item.brand,
      rawCategory: item.category,
      shopId
    });

    return {
      found: true,
      source: 'built_in_catalog',
      lookupStatus: 'complete',
      matchType: 'complete',
      currency: 'INR',
      product: {
        barcode: cleanBarcode,
        name: item.name,
        brand: item.brand,
        category: classification.category,
        subCategory: classification.subCategory,
        classificationStatus: classification.classificationStatus,
        classificationConfidence: classification.confidence,
        packSize: item.packSize,
        unit: item.unit || 'pcs',
        imageUrl: item.imageUrl,
        mrp: item.mrp,
        sellingPrice: item.mrp,
        purchasePrice: null,
        suggestedSellingPrice: item.mrp,
        suggestedPurchasePrice: null,
        priceDetected: true,
        isNewToShop: true
      }
    };
  }

  let catalogUnavailable = false;
  if (/^\d{8}$|^\d{12,14}$/.test(cleanBarcode)) try {
    const externalResponse = await axios.get(`${config.openFoodFactsUrl}/${encodeURIComponent(cleanBarcode.replace(/^0+(?=\d{12}$)/, ''))}.json`, {
      timeout: 5000,
      validateStatus: status => (status >= 200 && status < 300) || status === 404,
      headers: {
        'User-Agent': 'RetailPOSSaas/2.0 (contact@retailpos.local)'
      }
    });

    if (externalResponse.data && externalResponse.data.status === 1 && externalResponse.data.product) {
      const p = externalResponse.data.product;
      const normalizedName = p.product_name_en || p.product_name || p.generic_name || '';
      const brand = p.brands || p.brand_owner || '';
      const packSize = p.quantity || '';
      const imageUrl = p.image_front_url || p.image_url || null;

      // Intelligent classification through master category engine
      const classification = await classifyProduct({
        name: normalizedName,
        brand: brand,
        rawCategory: p.categories || '',
        externalTags: p.categories_tags || [],
        shopId
      });

      // Accept structured prices only when the source identifies their currency.
      const extractedMrp = String(p.currency || p.price_currency || '').toUpperCase() === 'INR'
        ? parsePriceFromText(`₹${p.price ?? p.product_price ?? ''}`)
        : parsePriceFromText(normalizedName) || parsePriceFromText(packSize) || parsePriceFromText(p.generic_name);

      const externalProduct = {
        barcode: cleanBarcode,
        name: normalizedName || `Item ${cleanBarcode}`,
        brand: brand,
        category: classification.category,
        subCategory: classification.subCategory,
        classificationStatus: classification.classificationStatus,
        classificationConfidence: classification.confidence,
        packSize: packSize,
        unit: 'pcs',
        imageUrl: imageUrl,
        mrp: extractedMrp,
        sellingPrice: extractedMrp,
        purchasePrice: null,
        suggestedSellingPrice: extractedMrp,
        suggestedPurchasePrice: null,
        priceDetected: !!extractedMrp,
        isNewToShop: true
      };

      // Opportunistically cache in MasterProduct catalog
      if (normalizedName && !extractedMrp) {
        try {
          await MasterProduct.create({
            barcode: cleanBarcode,
            name: externalProduct.name,
            brand: externalProduct.brand,
            category: externalProduct.category,
            subCategory: externalProduct.subCategory,
            packSize: externalProduct.packSize,
            imageUrl: externalProduct.imageUrl,
            mrp: extractedMrp || 0,
            verified: false,
            source: 'open_food_facts'
          });
        } catch {
          // Ignore duplicate insert race condition
        }
      }

      return {
        found: true,
        source: 'external_catalog',
        lookupStatus: normalizedName && extractedMrp ? 'complete' : 'partial',
        matchType: normalizedName && extractedMrp ? 'complete' : 'partial',
        currency: 'INR',
        product: externalProduct
      };
    }
  } catch (err) {
    catalogUnavailable = true;
    console.warn(`[BarcodeService] External lookup timed out or failed for ${cleanBarcode}:`, err.message);
  }

  // Tier 5: Unknown Barcode
  const fallbackClassification = await classifyProduct({ name: '', brand: '', shopId });

  return {
    found: false,
    source: 'none',
    lookupStatus: catalogUnavailable ? 'unavailable' : 'none',
    matchType: 'none',
    currency: 'INR',
    product: {
      barcode: cleanBarcode,
      name: '',
      brand: '',
      category: fallbackClassification.category,
      subCategory: fallbackClassification.subCategory,
      classificationStatus: fallbackClassification.classificationStatus,
      imageUrl: null,
      packSize: '',
      unit: 'pcs',
      mrp: null,
      sellingPrice: null,
      purchasePrice: null,
      priceDetected: false,
      isNewToShop: true
    },
    message: catalogUnavailable
      ? 'External catalog unavailable. Product details can be entered with automatic categorization.'
      : 'New barcode. Enter product details; category will automatically adapt.'
  };
}
