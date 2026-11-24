import { Category } from '../models/Category.js';
import { MASTER_CATEGORIES } from '../data/masterCategories.js';

/**
 * Normalizes strings by lowercasing, stripping punctuation, and trimming
 */
export function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export { normalizeText as normalizeCategoryText };

/**
 * Singular / plural basic stemmer for FMCG grocery terms
 */
export function stemWord(word) {
  if (!word || word.length <= 3) return word;
  const lower = word.toLowerCase();
  if (lower.endsWith('ies')) return lower.slice(0, -3) + 'y'; // cookies -> cookie, candies -> candy
  if (lower.endsWith('es') && !lower.endsWith('ses')) return lower.slice(0, -2); // noodles -> noodle, juices -> juice
  if (lower.endsWith('s') && !lower.endsWith('ss')) return lower.slice(0, -1); // biscuits -> biscuit, chips -> chip, salts -> salt
  return lower;
}

/**
 * Pre-compiled keyword index for fast matching
 */
const KEYWORD_RULES = [
  // Grocery & Staples
  { keywords: ['atta', 'flour', 'wheat', 'gehu', 'maida', 'suji', 'sooji', 'besan', 'semolina', 'rawa', 'chana flour'], category: 'Grocery & Staples', subCategory: 'Atta & Flours' },
  { keywords: ['rice', 'basmati', 'chawal', 'poha', 'daliya', 'sona masoori', 'kolam', 'broken wheat'], category: 'Grocery & Staples', subCategory: 'Rice & Rice Products' },
  { keywords: ['dal', 'dhal', 'pulses', 'toor', 'moong', 'chana', 'urad', 'masoor', 'rajma', 'chole', 'lentil', 'lentils'], category: 'Grocery & Staples', subCategory: 'Dals & Pulses' },
  { keywords: ['salt', 'namak', 'tata salt', 'sugar', 'cheeni', 'shakkar', 'jaggery', 'gur'], category: 'Grocery & Staples', subCategory: 'Salt, Sugar & Jaggery' },
  { keywords: ['soya', 'nutrela', 'mealmaker', 'soya chunks', 'soya granules'], category: 'Grocery & Staples', subCategory: 'Soya & Chunks' },

  // Oils & Ghee
  { keywords: ['mustard oil', 'sarson', 'kachi ghani'], category: 'Oils & Ghee', subCategory: 'Mustard Oil' },
  { keywords: ['sunflower oil', 'sunlite', 'fortune sunflower'], category: 'Oils & Ghee', subCategory: 'Sunflower Oil' },
  { keywords: ['ghee', 'desi ghee', 'cow ghee', 'amul ghee'], category: 'Oils & Ghee', subCategory: 'Desi Ghee' },
  { keywords: ['refined oil', 'vegetable oil', 'cooking oil', 'soybean oil', 'groundnut oil', 'peanut oil', 'olive oil'], category: 'Oils & Ghee', subCategory: 'Refined Vegetable Oil' },

  // Spices & Masala
  { keywords: ['garam masala', 'chicken masala', 'meat masala', 'biryani masala', 'pav bhaji masala', 'sambhar masala', 'chole masala', 'kitchen king', 'chaat masala', 'sabji masala'], category: 'Spices & Masala', subCategory: 'Blended Masalas' },
  { keywords: ['turmeric', 'haldi', 'chilli powder', 'mirch powder', 'coriander powder', 'dhaniya powder', 'jeera', 'cumin', 'hing', 'asafoetida', 'ginger garlic paste'], category: 'Spices & Masala', subCategory: 'Powdered Spices' },
  { keywords: ['clove', 'cloves', 'laung', 'cardamom', 'elaichi', 'cinnamon', 'dalchini', 'black pepper', 'kali mirch'], category: 'Spices & Masala', subCategory: 'Whole Spices (Khada Masala)' },

  // Dairy & Eggs
  { keywords: ['milk', 'doodh', 'toned milk', 'taaza', 'full cream', 'tetra milk', 'dairy'], category: 'Dairy & Eggs', subCategory: 'Milk & Flavored Milk' },
  { keywords: ['curd', 'dahi', 'yogurt', 'yoghurt', 'lassi', 'chaas', 'buttermilk'], category: 'Dairy & Eggs', subCategory: 'Curd & Yogurt' },
  { keywords: ['paneer', 'cottage cheese', 'tofu'], category: 'Dairy & Eggs', subCategory: 'Paneer & Tofu' },
  { keywords: ['butter', 'amul butter', 'white butter', 'margarine'], category: 'Dairy & Eggs', subCategory: 'Butter & Spreads' },
  { keywords: ['cheese', 'cheese slice', 'cheese cube', 'mozzarella'], category: 'Dairy & Eggs', subCategory: 'Cheese & Cream' },
  { keywords: ['egg', 'eggs', 'anda'], category: 'Dairy & Eggs', subCategory: 'Eggs' },

  // Bakery
  { keywords: ['bread', 'white bread', 'brown bread', 'whole wheat bread', 'pav', 'bun', 'buns', 'burger bun'], category: 'Bakery', subCategory: 'Bread & Buns' },
  { keywords: ['cake', 'cakes', 'muffin', 'muffins', 'cupcake', 'pastry', 'winkies', 'bar cake'], category: 'Bakery', subCategory: 'Cakes & Muffins' },
  { keywords: ['rusk', 'rusks', 'toast', 'suji rusk', 'tea toast'], category: 'Bakery', subCategory: 'Rusks & Toast' },

  // Biscuits & Cookies
  { keywords: ['parle-g', 'parle g', 'glucose', 'marie', 'marie gold'], category: 'Biscuits & Cookies', subCategory: 'Glucose & Marie Biscuits' },
  { keywords: ['good day', 'unibic', 'cookie', 'cookies', 'butter cookie', 'shortbread', 'chocochip'], category: 'Biscuits & Cookies', subCategory: 'Cookies & Butter Biscuits' },
  { keywords: ['bourbon', 'oreo', 'dark fantasy', 'jim jam', 'treat', 'cream biscuit', 'bounce'], category: 'Biscuits & Cookies', subCategory: 'Cream & Sandwich Biscuits' },
  { keywords: ['digestive', 'nutrichoice', 'oats biscuit', 'ragi biscuit'], category: 'Biscuits & Cookies', subCategory: 'Digestive & Healthy Biscuits' },
  { keywords: ['monaco', 'krackjack', '50-50', 'cracker', 'crackers', 'salted biscuit'], category: 'Biscuits & Cookies', subCategory: 'Salted & Cracker Biscuits' },

  // Snacks
  { keywords: ['lays', 'potato chips', 'bingo', 'pringles', 'chips', 'crisps', 'uncle chipps'], category: 'Snacks', subCategory: 'Potato Chips & Crisps' },
  { keywords: ['kurkure', 'namkeen', 'bhujia', 'sev', 'mixture', 'chivda', 'haldirams', 'bikaji'], category: 'Snacks', subCategory: 'Namkeen & Traditional Snacks' },
  { keywords: ['popcorn', 'act ii', 'nachos', 'doritos', 'fryums', 'papads', 'papad'], category: 'Snacks', subCategory: 'Nachos & Popcorn' },

  // Chocolates & Sweets
  { keywords: ['cadbury', 'dairy milk', 'silk', 'kitkat', '5 star', 'munch', 'perk', 'snickers', 'chocolate', 'chocolates'], category: 'Chocolates & Sweets', subCategory: 'Chocolates & Bars' },
  { keywords: ['gulab jamun', 'rasgulla', 'halwa', 'soan papdi', 'mithai', 'sweets'], category: 'Chocolates & Sweets', subCategory: 'Packaged Indian Sweets' },

  // Beverages
  { keywords: ['coca cola', 'coke', 'thums up', 'sprite', 'pepsi', 'fanta', 'mirinda', 'mountain dew', '7up', 'limca', 'soft drink', 'soda'], category: 'Beverages', subCategory: 'Soft Drinks & Carbonated' },
  { keywords: ['real juice', 'tropicana', 'frooti', 'maaza', 'slice', 'b-natural', 'fruit juice', 'mango drink'], category: 'Beverages', subCategory: 'Fruit Juices & Drinks' },
  { keywords: ['mineral water', 'bisleri', 'kinley', 'aquafina', 'drinking water'], category: 'Beverages', subCategory: 'Bottled Water & Soda' },

  // Tea & Coffee
  { keywords: ['tea', 'chai', 'red label', 'taj mahal', 'tata tea', 'wagh bakri', 'green tea', 'lipton', 'tetley'], category: 'Tea & Coffee', subCategory: 'Tea & Tea Bags' },
  { keywords: ['coffee', 'nescafe', 'bru', 'filter coffee', 'instant coffee', 'davidoff'], category: 'Tea & Coffee', subCategory: 'Instant & Ground Coffee' },

  // Instant & Ready-to-Cook Food
  { keywords: ['maggi', 'yippee', 'noodles', 'top ramen', 'wai wai', 'instant noodles', 'ramen', 'hakka noodles'], category: 'Instant & Ready-to-Cook Food', subCategory: 'Noodles' },
  { keywords: ['pasta', 'macaroni', 'vermicelli pasta', 'penne', 'fusilli'], category: 'Instant & Ready-to-Cook Food', subCategory: 'Pasta & Macaroni' },
  { keywords: ['soup', 'knorr', 'ching', 'tomato soup', 'hot and sour'], category: 'Instant & Ready-to-Cook Food', subCategory: 'Instant Soups' },
  { keywords: ['ready to eat', 'mTR', 'instant mix', 'dosa mix', 'idli mix', 'gulab jamun mix', 'dhokla mix', 'upma mix'], category: 'Instant & Ready-to-Cook Food', subCategory: 'Ready Mixes (Dosa, Idli, Gulab Jamun)' },

  // Breakfast Foods
  { keywords: ['corn flakes', 'kelloggs', 'chocos', 'muesli', 'cereal', 'cereals', 'oats', 'quaker', 'saffola oats'], category: 'Breakfast Foods', subCategory: 'Oats & Porridge' },

  // Sauces & Condiments
  { keywords: ['ketchup', 'tomato sauce', 'kissan', 'maggi sauce', 'chilli sauce', 'soya sauce', 'vinegar', 'mayonnaise', 'shezwan'], category: 'Sauces & Condiments', subCategory: 'Tomato Ketchup & Sauces' },
  { keywords: ['pickle', 'achar', 'aachar', 'mango pickle', 'mixed pickle', 'lime pickle', 'chutney'], category: 'Sauces & Condiments', subCategory: 'Pickles & Chutneys' },

  // Dry Fruits & Nuts
  { keywords: ['almond', 'almonds', 'badam', 'cashew', 'cashews', 'kaju', 'pista', 'pistachio', 'walnut', 'kishmish', 'raisin', 'dates', 'anjeer'], category: 'Dry Fruits & Nuts', subCategory: 'Almonds & Cashews' },

  // Personal Care
  { keywords: ['soap', 'bathing soap', 'dettol', 'lifebuoy', 'lux', 'dove', 'pears', 'santoor', 'body wash', 'shower gel'], category: 'Personal Care', subCategory: 'Soaps & Body Wash' },
  { keywords: ['shampoo', 'conditioner', 'head & shoulders', 'pantene', 'sunsilk', 'clinic plus', 'hair oil', 'parachute', 'dabur amla', 'bajaj almond'], category: 'Personal Care', subCategory: 'Hair Care & Shampoos' },
  { keywords: ['toothpaste', 'colgate', 'pepsodent', 'sensodyne', 'dabur red', 'close up', 'toothbrush', 'mouthwash'], category: 'Personal Care', subCategory: 'Oral Care' },

  // Household Cleaning
  { keywords: ['surf excel', 'tide', 'ariel', 'rin', 'ghari', 'wheel', 'washing powder', 'detergent', 'detergents', 'laundry'], category: 'Household Cleaning', subCategory: 'Laundry Detergents & Powders' },
  { keywords: ['dishwash', 'vim', 'pril', 'exo', 'dishwash bar', 'dishwash gel', 'dishwash liquid'], category: 'Household Cleaning', subCategory: 'Dishwash Bars & Gels' },
  { keywords: ['harpic', 'toilet cleaner', 'lizol', 'floor cleaner', 'colin', 'glass cleaner', 'domex', 'phenyl'], category: 'Household Cleaning', subCategory: 'Toilet & Surface Cleaners' },

  // Baby Care
  { keywords: ['diaper', 'diapers', 'pampers', 'huggies', 'mamy poko', 'baby wipes', 'johnsons baby', 'baby lotion', 'baby powder'], category: 'Baby Care', subCategory: 'Diapers & Wipes' },

  // Pooja Essentials
  { keywords: ['agarbatti', 'incense stick', 'incense sticks', 'dhoop', 'camphor', 'kapoor', 'cycle pure', 'mangaldeep', 'diya batti', 'pooja oil'], category: 'Pooja Essentials', subCategory: 'Agarbatti & Dhoop' }
];

/**
 * Checks if an alias matches an input phrase as a whole word or exact stemmed phrase
 */
function matchesWordOrExact(alias, input, stemmedInput) {
  const cleanAlias = normalizeText(alias);
  if (!cleanAlias) return false;
  if (cleanAlias === input || stemWord(cleanAlias) === stemmedInput) return true;
  const escaped = cleanAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(input) || regex.test(stemmedInput);
}

/**
 * Intelligent Category Classification Engine
 */
export async function classifyProduct({
  name = '',
  brand = '',
  rawCategory = '',
  category = '',
  categories = [],
  externalTags = [],
  tags = [],
  shopId = null
}) {
  // Aggregate categories & tags from flexible parameter names
  const allCategories = [
    ...(rawCategory ? [rawCategory] : []),
    ...(category ? [category] : []),
    ...(Array.isArray(categories) ? categories : [categories])
  ].filter(Boolean);

  const allTags = [
    ...(Array.isArray(externalTags) ? externalTags : [externalTags]),
    ...(Array.isArray(tags) ? tags : [tags])
  ].filter(Boolean);

  const categoryString = allCategories.join(' ');
  const cleanName = normalizeText(name);
  const cleanBrand = normalizeText(brand);
  const cleanCatStr = normalizeText(categoryString);

  const combinedSearchText = `${cleanName} ${cleanBrand} ${cleanCatStr}`.toLowerCase();
  const searchWords = combinedSearchText.split(' ').filter(w => w.length > 1);
  const stemmedWords = searchWords.map(stemWord);

  // 1. Direct Category Matching against Master Supermarket Categories & Aliases
  for (const catInput of allCategories) {
    const cleanInput = normalizeText(catInput);
    if (!cleanInput) continue;
    const stemmedInput = stemWord(cleanInput);

    // Prioritize checking subcategories first for more specific classification
    for (const master of MASTER_CATEGORIES) {
      for (const sub of master.subcategories || []) {
        const matchSub =
          matchesWordOrExact(sub.name, cleanInput, stemmedInput) ||
          (sub.aliases || []).some(a => matchesWordOrExact(a, cleanInput, stemmedInput));

        if (matchSub) {
          return {
            category: master.name,
            subCategory: sub.name,
            categoryId: null,
            subCategoryId: null,
            classificationStatus: 'auto_assigned',
            confidence: 95,
            matchReason: `Matched subcategory alias '${cleanInput}'`
          };
        }
      }
    }

    // Next check main categories
    for (const master of MASTER_CATEGORIES) {
      const matchMain =
        matchesWordOrExact(master.name, cleanInput, stemmedInput) ||
        (master.aliases || []).some(a => matchesWordOrExact(a, cleanInput, stemmedInput));

      if (matchMain) {
        let matchedSub = master.subcategories?.[0]?.name || master.name;
        for (const sub of master.subcategories || []) {
          if (
            matchesWordOrExact(sub.name, cleanInput, stemmedInput) ||
            (sub.aliases || []).some(a => matchesWordOrExact(a, cleanInput, stemmedInput))
          ) {
            matchedSub = sub.name;
            break;
          }
        }

        return {
          category: master.name,
          subCategory: matchedSub,
          categoryId: null,
          subCategoryId: null,
          classificationStatus: 'auto_assigned',
          confidence: 95,
          matchReason: `Matched category alias '${cleanInput}'`
        };
      }
    }
  }

  // 2. Match external tags (e.g. Open Food Facts tags 'en:instant-noodles', 'en:milks', etc.)
  if (allTags.length > 0) {
    const normalizedTags = allTags.map(t => String(t).toLowerCase().replace(/^en:/, ''));

    for (const tag of normalizedTags) {
      for (const master of MASTER_CATEGORIES) {
        const matchesTag = (master.externalMappings || []).some(m => {
          const cleanM = m.toLowerCase().replace(/^en:/, '');
          return cleanM === tag || tag.includes(cleanM) || cleanM.includes(tag);
        });

        if (matchesTag) {
          const defaultSub = master.subcategories?.[0]?.name || master.name;
          return {
            category: master.name,
            subCategory: defaultSub,
            categoryId: null,
            subCategoryId: null,
            classificationStatus: 'auto_assigned',
            confidence: 90,
            matchReason: `Matched external catalog tag '${tag}'`
          };
        }
      }
    }
  }

  // 3. Keyword Scoring Rule Matching against product name, brand and category
  let bestMatch = null;
  let highestScore = 0;

  for (const rule of KEYWORD_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const cleanKw = kw.toLowerCase();
      // Exact substring match
      if (combinedSearchText.includes(cleanKw)) {
        score += cleanKw.length >= 6 ? 12 : 6;
      } else {
        // Word or stemmed match
        const kwWords = cleanKw.split(' ');
        if (kwWords.length === 1 && (searchWords.includes(cleanKw) || stemmedWords.includes(stemWord(cleanKw)))) {
          score += 5;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = rule;
    }
  }

  if (bestMatch && highestScore >= 5) {
    return {
      category: bestMatch.category,
      subCategory: bestMatch.subCategory,
      categoryId: null,
      subCategoryId: null,
      classificationStatus: 'auto_assigned',
      confidence: Math.min(60 + highestScore * 4, 98),
      matchReason: `Matched supermarket product keywords (score: ${highestScore})`
    };
  }

  // 4. Fallback to "Others" without failing
  return {
    category: 'Others',
    subCategory: 'General Others',
    categoryId: null,
    subCategoryId: null,
    classificationStatus: 'pending_classification',
    confidence: 20,
    matchReason: 'No high-confidence supermarket classification found; assigned to Others for review'
  };
}
