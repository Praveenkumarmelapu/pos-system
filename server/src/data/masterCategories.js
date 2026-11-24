/**
 * Master Supermarket Category Database
 * 33 Standard Main Categories and extensive Indian FMCG subcategories,
 * aliases, and external database mappings (Open Food Facts / Open Beauty Facts).
 */

export const MASTER_CATEGORIES = [
  {
    name: 'Grocery & Staples',
    slug: 'grocery-staples',
    icon: 'Wheat',
    displayOrder: 1,
    aliases: ['grocery', 'groceries', 'staples', 'kirana', 'grains', 'flour', 'flours', 'dal', 'dals', 'pulses', 'atta', 'chawal', 'rice', 'sugar', 'salt', 'namak', 'cheeni', 'shakkar', 'suji', 'besan', 'maida', 'soya', 'poha', 'daliya', 'cereals'],
    externalMappings: ['en:plant-based-foods', 'en:cereals-and-potatoes', 'en:cereals-and-their-products', 'en:flours', 'en:rices', 'en:pulses', 'en:salts', 'en:sugars', 'en:groceries', 'en:grains'],
    subcategories: [
      { name: 'Atta & Flours', slug: 'atta-flours', aliases: ['atta', 'wheat flour', 'gehu atta', 'multigrain atta', 'chakki atta', 'flour'] },
      { name: 'Rice & Rice Products', slug: 'rice-rice-products', aliases: ['rice', 'basmati', 'sona masoori', 'kolam', 'chawal', 'brown rice', 'boiled rice', 'idli rice'] },
      { name: 'Dals & Pulses', slug: 'dals-pulses', aliases: ['dal', 'toor dal', 'moong dal', 'chana dal', 'urad dal', 'masoor dal', 'rajma', 'chole', 'kabuli chana'] },
      { name: 'Salt, Sugar & Jaggery', slug: 'salt-sugar-jaggery', aliases: ['salt', 'tata salt', 'sugar', 'jaggery', 'gur', 'brown sugar', 'rock salt', 'sendha namak'] },
      { name: 'Suji, Maida & Besan', slug: 'suji-maida-besan', aliases: ['suji', 'sooji', 'semolina', 'rawa', 'maida', 'besan', 'gram flour'] },
      { name: 'Poha & Daliya', slug: 'poha-daliya', aliases: ['poha', 'flattened rice', 'daliya', 'broken wheat', 'vermicelli'] },
      { name: 'Soya & Chunks', slug: 'soya-chunks', aliases: ['soya', 'soya chunks', 'nutrela', 'mealmaker', 'soya granules'] }
    ]
  },
  {
    name: 'Oils & Ghee',
    slug: 'oils-ghee',
    icon: 'Droplet',
    displayOrder: 2,
    aliases: ['oil', 'oils', 'ghee', 'cooking oil', 'edible oil', 'sarson ka tel', 'tel', 'mustard oil', 'sunflower oil', 'dalda', 'vanaspati'],
    externalMappings: ['en:fats', 'en:vegetable-oils', 'en:cooking-oils', 'en:ghee', 'en:olive-oils', 'en:sunflower-oils'],
    subcategories: [
      { name: 'Mustard Oil', slug: 'mustard-oil', aliases: ['mustard oil', 'sarson tel', 'kachi ghani', 'mustard'] },
      { name: 'Sunflower Oil', slug: 'sunflower-oil', aliases: ['sunflower oil', 'fortune sunflower', 'sunlite', 'refined sunflower'] },
      { name: 'Refined Vegetable Oil', slug: 'refined-vegetable-oil', aliases: ['refined oil', 'vegetable oil', 'soybean oil', 'cottonseed oil', 'corn oil'] },
      { name: 'Groundnut & Peanut Oil', slug: 'groundnut-peanut-oil', aliases: ['groundnut oil', 'peanut oil', 'mungfali tel'] },
      { name: 'Desi Ghee', slug: 'desi-ghee', aliases: ['ghee', 'desi ghee', 'cow ghee', 'amul ghee', 'ananda ghee', 'mother dairy ghee'] },
      { name: 'Olive & Specialty Oil', slug: 'olive-specialty-oil', aliases: ['olive oil', 'extra virgin olive oil', 'sesame oil', 'til oil', 'coconut oil for cooking', 'rice bran oil'] }
    ]
  },
  {
    name: 'Spices & Masala',
    slug: 'spices-masala',
    icon: 'Flame',
    displayOrder: 3,
    aliases: ['spice', 'spices', 'masala', 'masale', 'mirch', 'haldi', 'dhaniya', 'jeera', 'hing', 'turmeric', 'chilli', 'garam masala', 'sambhar masala'],
    externalMappings: ['en:spices', 'en:condiments', 'en:herbs-and-spices', 'en:culinary-plants', 'en:curry-powders'],
    subcategories: [
      { name: 'Whole Spices (Khada Masala)', slug: 'whole-spices', aliases: ['jeera', 'cumin', 'mustard seeds', 'rai', 'cardamom', 'elaichi', 'laung', 'cloves', 'cinnamon', 'dalchini', 'black pepper', 'kali mirch', 'methi seeds'] },
      { name: 'Powdered Spices', slug: 'powdered-spices', aliases: ['haldi powder', 'turmeric powder', 'red chilli powder', 'lal mirch', 'dhaniya powder', 'coriander powder', 'amchur'] },
      { name: 'Blended Masalas', slug: 'blended-masalas', aliases: ['garam masala', 'chicken masala', 'meat masala', 'biryani masala', 'pav bhaji masala', 'sambhar masala', 'chole masala', 'kitchen king', 'chaat masala', 'everest', 'mdh', 'catch'] },
      { name: 'Cooking Pastes & Hing', slug: 'cooking-pastes-hing', aliases: ['ginger garlic paste', 'adrak lehsun paste', 'hing', 'asafoetida', 'kasuri methi'] }
    ]
  },
  {
    name: 'Fruits & Vegetables',
    slug: 'fruits-vegetables',
    icon: 'Apple',
    displayOrder: 4,
    aliases: ['fruits', 'vegetables', 'veggies', 'produce', 'sabzi', 'sabji', 'fal', 'aloo', 'pyaz', 'tamatar', 'potato', 'onion', 'tomato', 'fresh produce'],
    externalMappings: ['en:fruits-and-vegetables-based-foods', 'en:fresh-vegetables', 'en:fresh-fruits', 'en:vegetables', 'en:fruits'],
    subcategories: [
      { name: 'Daily Vegetables', slug: 'daily-vegetables', aliases: ['potato', 'onion', 'tomato', 'aloo', 'pyaz', 'tamatar', 'ginger', 'adrak', 'garlic', 'lehsun', 'green chilli', 'hari mirch'] },
      { name: 'Green & Leafy Veggies', slug: 'leafy-veggies', aliases: ['palak', 'spinach', 'coriander', 'dhaniya patta', 'methi', 'cabbage', 'cauliflower', 'gobi', 'bhindi', 'okra'] },
      { name: 'Fresh Fruits', slug: 'fresh-fruits', aliases: ['apple', 'banana', 'orange', 'mango', 'grapes', 'papaya', 'pomegranate', 'watermelon', 'kela', 'seb'] }
    ]
  },
  {
    name: 'Dairy & Eggs',
    slug: 'dairy-eggs',
    icon: 'Milk',
    displayOrder: 5,
    aliases: ['dairy', 'milk', 'eggs', 'doodh', 'dahi', 'paneer', 'butter', 'cheese', 'curd', 'lassi', 'chaas', 'cream', 'amul', 'mother dairy'],
    externalMappings: ['en:dairies', 'en:milks', 'en:cheeses', 'en:yogurts', 'en:butters', 'en:eggs', 'en:fermented-dairy-products'],
    subcategories: [
      { name: 'Milk & Flavored Milk', slug: 'milk-flavored-milk', aliases: ['milk', 'toned milk', 'full cream milk', 'cow milk', 'taaza', 'gold', 'tetra pack milk', 'flavored milk'] },
      { name: 'Curd & Yogurt', slug: 'curd-yogurt', aliases: ['curd', 'dahi', 'greek yogurt', 'yogurt', 'misti doi'] },
      { name: 'Paneer & Tofu', slug: 'paneer-tofu', aliases: ['paneer', 'fresh paneer', 'cottage cheese', 'tofu'] },
      { name: 'Butter & Spreads', slug: 'butter-spreads', aliases: ['butter', 'salted butter', 'amul butter', 'white butter', 'garlic butter', 'margarine'] },
      { name: 'Cheese & Cream', slug: 'cheese-cream', aliases: ['cheese', 'cheese cubes', 'cheese slices', 'mozzarella', 'fresh cream', 'whipping cream'] },
      { name: 'Eggs', slug: 'eggs', aliases: ['eggs', 'white eggs', 'brown eggs', 'farm eggs', 'anda', 'country eggs'] },
      { name: 'Buttermilk & Lassi', slug: 'buttermilk-lassi', aliases: ['chaas', 'buttermilk', 'lassi', 'sweet lassi', 'mango lassi'] }
    ]
  },
  {
    name: 'Bakery',
    slug: 'bakery',
    icon: 'Cake',
    displayOrder: 6,
    aliases: ['bakery', 'bread', 'pav', 'bun', 'buns', 'cake', 'cakes', 'rusk', 'toast', 'khari', 'puff', 'muffin'],
    externalMappings: ['en:breads', 'en:bakery-products', 'en:cakes', 'en:pastries'],
    subcategories: [
      { name: 'Bread & Buns', slug: 'bread-buns', aliases: ['white bread', 'brown bread', 'whole wheat bread', 'multigrain bread', 'pav', 'burger bun', 'hot dog bun'] },
      { name: 'Cakes & Muffins', slug: 'cakes-muffins', aliases: ['cake', 'sponge cake', 'bar cake', 'cupcake', 'muffin', 'plum cake', 'britannia cake', 'winkies'] },
      { name: 'Rusks & Toast', slug: 'rusks-toast', aliases: ['rusk', 'suji rusk', 'toast', 'milk rusk', 'tea toast'] },
      { name: 'Baking Essentials', slug: 'baking-essentials', aliases: ['yeast', 'baking powder', 'baking soda', 'cocoa powder', 'vanilla essence'] }
    ]
  },
  {
    name: 'Biscuits & Cookies',
    slug: 'biscuits-cookies',
    icon: 'Cookie',
    displayOrder: 7,
    aliases: ['biscuit', 'biscuits', 'cookie', 'cookies', 'glucose', 'marie', 'digestive', 'cracker', 'wafers', 'parle-g', 'good day', 'britannia biscuits'],
    externalMappings: ['en:biscuits-and-cakes', 'en:biscuits', 'en:cookies', 'en:wafers'],
    subcategories: [
      { name: 'Glucose & Marie Biscuits', slug: 'glucose-marie', aliases: ['parle-g', 'glucose biscuit', 'marie gold', 'marie biscuit', 'parle'] },
      { name: 'Cookies & Butter Biscuits', slug: 'cookies-butter', aliases: ['good day', 'butter cookie', 'unibic', 'shortbread', 'chocochip cookie', '20-20'] },
      { name: 'Cream & Sandwich Biscuits', slug: 'cream-sandwich', aliases: ['bourbon', 'oreo', 'dark fantasy', 'jim jam', 'treat', 'cream biscuit', 'bounce'] },
      { name: 'Digestive & Healthy Biscuits', slug: 'digestive-healthy', aliases: ['digestive', 'nutrichoice', 'oats biscuit', 'ragi biscuit', 'sugar free biscuit'] },
      { name: 'Salted & Cracker Biscuits', slug: 'salted-crackers', aliases: ['monaco', 'krackjack', '50-50', 'timepass', 'salted biscuits'] }
    ]
  },
  {
    name: 'Snacks',
    slug: 'snacks',
    icon: 'Popcorn',
    displayOrder: 8,
    aliases: ['snack', 'snacks', 'namkeen', 'chips', 'crisps', 'bhujia', 'sev', 'kurkure', 'lays', 'popcorn', 'makhana', 'chivda', 'farsan'],
    externalMappings: ['en:snacks', 'en:salty-snacks', 'en:appetizers', 'en:chips-and-fries', 'en:crisps'],
    subcategories: [
      { name: 'Potato Chips & Crisps', slug: 'potato-chips', aliases: ['lays', 'potato chips', 'bingo', 'pringles', 'uncle chipps', 'wafers'] },
      { name: 'Namkeen, Bhujia & Sev', slug: 'namkeen-bhujia', aliases: ['haldiram', 'bhujia', 'aloo bhujia', 'sev', 'bikanervala', 'moong dal namkeen', 'khatta meetha', 'navratan mixture'] },
      { name: 'Extruded & Puffed Snacks', slug: 'extruded-puffed', aliases: ['kurkure', 'mad angles', 'tedhe medhe', 'puffs', 'cheese balls', 'crax'] },
      { name: 'Popcorn & Roasted Snacks', slug: 'popcorn-roasted', aliases: ['popcorn', 'act ii', 'roasted chana', 'makhana', 'fox nuts', 'peanut namkeen'] }
    ]
  },
  {
    name: 'Chocolates & Sweets',
    slug: 'chocolates-sweets',
    icon: 'Candy',
    displayOrder: 9,
    aliases: ['chocolate', 'chocolates', 'sweets', 'mithai', 'candy', 'candies', 'toffee', 'cadbury', 'kitkat', 'dairy milk', 'gulab jamun', 'halwa'],
    externalMappings: ['en:sweet-snacks', 'en:chocolates', 'en:confectioneries', 'en:candies'],
    subcategories: [
      { name: 'Chocolates & Bars', slug: 'chocolates-bars', aliases: ['dairy milk', 'cadbury', 'kitkat', '5 star', 'snickers', 'munch', 'perk', 'dark chocolate', 'ferrero rocher'] },
      { name: 'Candies, Gums & Mints', slug: 'candies-gums-mints', aliases: ['toffee', 'candy', 'eclairs', 'alpenliebe', 'center fresh', 'mentos', 'halls', 'orbit', 'lollipop'] },
      { name: 'Packaged Indian Sweets', slug: 'packaged-indian-sweets', aliases: ['gulab jamun', 'rasgulla', 'haldiram rasgulla', 'soan papdi', 'kaju katli', 'peda', 'mithai'] }
    ]
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    icon: 'CupSoda',
    displayOrder: 10,
    aliases: ['beverage', 'beverages', 'drinks', 'soft drink', 'cold drink', 'soda', 'juice', 'juices', 'coke', 'pepsi', 'sprite', 'water', 'frooti'],
    externalMappings: ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:fruit-juices', 'en:waters', 'en:energy-drinks'],
    subcategories: [
      { name: 'Soft Drinks & Carbonated Water', slug: 'soft-drinks', aliases: ['coca cola', 'coke', 'thums up', 'pepsi', 'sprite', 'fanta', 'mirinda', 'limca', '7up', 'mountain dew', 'soda', 'kinley soda'] },
      { name: 'Fruit Juices & Nectars', slug: 'fruit-juices', aliases: ['real juice', 'tropicana', 'frooti', 'maaza', 'slice', 'b natural', 'appy fizz', 'fruit juice', 'mango drink'] },
      { name: 'Energy & Sports Drinks', slug: 'energy-sports-drinks', aliases: ['red bull', 'sting', 'monster', 'gatorade', 'energy drink'] },
      { name: 'Packaged Water & Concentrates', slug: 'water-concentrates', aliases: ['mineral water', 'bisleri', 'aquafina', 'kinley', 'rooh afza', 'tang', 'rasna', 'squash'] }
    ]
  },
  {
    name: 'Tea & Coffee',
    slug: 'tea-coffee',
    icon: 'Coffee',
    displayOrder: 11,
    aliases: ['tea', 'coffee', 'chai', 'chai patti', 'green tea', 'instant coffee', 'filter coffee', 'nescafe', 'bru', 'red label', 'tata tea'],
    externalMappings: ['en:teas', 'en:coffees', 'en:hot-beverages', 'en:instant-coffees'],
    subcategories: [
      { name: 'Tea & Leaf Tea', slug: 'tea-leaf-tea', aliases: ['red label', 'tata tea', 'wagh bakri', 'taj mahal', 'taaza', 'ctc tea', 'tea bags', 'loose tea'] },
      { name: 'Green & Herbal Tea', slug: 'green-herbal-tea', aliases: ['green tea', 'lipton green tea', 'tetley', 'chamomile', 'herbal tea', 'organic india tulsi tea'] },
      { name: 'Coffee & Premixes', slug: 'coffee-premixes', aliases: ['nescafe', 'bru', 'continental', 'instant coffee', 'filter coffee', 'coffee powder', 'sunrise'] }
    ]
  },
  {
    name: 'Instant & Ready-to-Cook Food',
    slug: 'instant-ready-food',
    icon: 'Utensils',
    displayOrder: 12,
    aliases: ['instant food', 'ready to cook', 'maggi', 'noodles', 'pasta', 'macaroni', 'vermicelli', 'instant noodles', 'soup', 'ready to eat', 'ramen', 'yippee'],
    externalMappings: ['en:instant-noodles', 'en:pastas', 'en:noodles', 'en:soups', 'en:meals', 'en:instant-meals'],
    subcategories: [
      { name: 'Instant Noodles & Ramen', slug: 'instant-noodles', aliases: ['maggi', 'maggi noodles', 'yippee', 'top ramen', 'wai wai', 'hakka noodles', 'korean noodles', 'ramen'] },
      { name: 'Pasta & Vermicelli', slug: 'pasta-vermicelli', aliases: ['pasta', 'macaroni', 'fusilli', 'penne', 'vermicelli', 'semiya', 'bambino'] },
      { name: 'Instant Soups', slug: 'instant-soups', aliases: ['knorr soup', 'ching secret soup', 'instant soup', 'tomato soup', 'manchow soup'] },
      { name: 'Ready Meals & Mixes', slug: 'ready-meals-mixes', aliases: ['ready to eat', 'mtr ready meal', 'idli mix', 'dosa mix', 'gulab jamun mix', 'dhokla mix', 'upma mix'] }
    ]
  },
  {
    name: 'Breakfast Foods',
    slug: 'breakfast-foods',
    icon: 'Croissant',
    displayOrder: 13,
    aliases: ['breakfast', 'cereal', 'cereals', 'corn flakes', 'oats', 'muesli', 'kelloggs', 'quaker', 'honey', 'jam', 'peanut butter'],
    externalMappings: ['en:breakfasts', 'en:breakfast-cereals', 'en:spreads', 'en:sweet-spreads', 'en:honeys'],
    subcategories: [
      { name: 'Oats & Porridge', slug: 'oats-porridge', aliases: ['oats', 'quaker oats', 'saffola masala oats', 'rolled oats', 'instant oats'] },
      { name: 'Flakes & Muesli', slug: 'flakes-muesli', aliases: ['corn flakes', 'kelloggs', 'chocos', 'muesli', 'granola', 'wheat flakes'] },
      { name: 'Jams, Honey & Spreads', slug: 'jams-honey-spreads', aliases: ['kissan jam', 'mixed fruit jam', 'honey', 'dabur honey', 'patanjali honey', 'peanut butter', 'nutella'] }
    ]
  },
  {
    name: 'Frozen Foods',
    slug: 'frozen-foods',
    icon: 'Snowflake',
    displayOrder: 14,
    aliases: ['frozen', 'frozen food', 'frozen peas', 'safal', 'mccain', 'french fries', 'nuggets', 'frozen veg'],
    externalMappings: ['en:frozen-foods', 'en:frozen-vegetables', 'en:frozen-ready-made-meals'],
    subcategories: [
      { name: 'Frozen Vegetables', slug: 'frozen-vegetables', aliases: ['frozen green peas', 'safal peas', 'frozen corn', 'sweet corn', 'mixed frozen veg'] },
      { name: 'Frozen Snacks & Fries', slug: 'frozen-snacks-fries', aliases: ['mccain', 'french fries', 'potato bites', 'veg nuggets', 'smiles', 'frozen paratha', 'frozen samosa'] }
    ]
  },
  {
    name: 'Ice Cream & Desserts',
    slug: 'ice-cream-desserts',
    icon: 'IceCream',
    displayOrder: 15,
    aliases: ['ice cream', 'ice creams', 'kulfi', 'dessert', 'desserts', 'kwality walls', 'amul ice cream', 'cornetto', 'custard powder'],
    externalMappings: ['en:desserts', 'en:ice-creams', 'en:frozen-desserts'],
    subcategories: [
      { name: 'Ice Cream Tubs & Bars', slug: 'ice-cream-tubs-bars', aliases: ['ice cream tub', 'vanilla ice cream', 'chocolate ice cream', 'cornetto', 'chocobar', 'kulfi', 'feast'] },
      { name: 'Dessert Mixes & Syrups', slug: 'dessert-mixes-syrups', aliases: ['custard powder', 'hershey syrup', 'chocolate syrup', 'jelly mix', 'falooda mix'] }
    ]
  },
  {
    name: 'Meat & Seafood',
    slug: 'meat-seafood',
    icon: 'Fish',
    displayOrder: 16,
    aliases: ['meat', 'chicken', 'mutton', 'fish', 'seafood', 'prawns', 'poultry', 'non veg'],
    externalMappings: ['en:meats', 'en:poultries', 'en:fishes', 'en:seafood'],
    subcategories: [
      { name: 'Fresh & Chilled Poultry', slug: 'fresh-poultry', aliases: ['chicken', 'chicken breast', 'chicken curry cut', 'boneless chicken'] },
      { name: 'Fresh Meat & Mutton', slug: 'fresh-meat-mutton', aliases: ['mutton', 'lamb', 'goat meat', 'keema'] },
      { name: 'Fish & Seafood', slug: 'fish-seafood', aliases: ['fish', 'rohu', 'katla', 'prawns', 'salmon', 'pomfret'] }
    ]
  },
  {
    name: 'Sauces & Condiments',
    slug: 'sauces-condiments',
    icon: 'Salad',
    displayOrder: 17,
    aliases: ['sauce', 'sauces', 'ketchup', 'tomato sauce', 'mayonnaise', 'mayo', 'achaar', 'pickle', 'vinegar', 'soya sauce', 'chilli sauce', 'chutney'],
    externalMappings: ['en:sauces', 'en:condiments', 'en:tomato-sauces', 'en:dressings', 'en:pickles'],
    subcategories: [
      { name: 'Tomato Ketchup & Sauces', slug: 'tomato-ketchup', aliases: ['kissan ketchup', 'maggi tomato sauce', 'heinz ketchup', 'del monte', 'tomato puree'] },
      { name: 'Cooking Sauces & Asian', slug: 'cooking-sauces-asian', aliases: ['soya sauce', 'chilli sauce', 'vinegar', 'schezwan sauce', 'ching secret', 'pasta sauce', 'pizza sauce'] },
      { name: 'Mayonnaise & Dips', slug: 'mayonnaise-dips', aliases: ['mayonnaise', 'veg mayo', 'veeba', 'cheese dip', 'salad dressing'] },
      { name: 'Pickles & Chutneys', slug: 'pickles-chutneys', aliases: ['achaar', 'mango pickle', 'mixed pickle', 'lime pickle', 'mother recipe', 'priya pickle', 'chutney'] }
    ]
  },
  {
    name: 'Dry Fruits & Nuts',
    slug: 'dry-fruits-nuts',
    icon: 'Nut',
    displayOrder: 18,
    aliases: ['dry fruits', 'dry fruit', 'nuts', 'kaju', 'badam', 'pista', 'kishmish', 'akhrot', 'almonds', 'cashews', 'raisins', 'walnuts', 'dates', 'khajoor'],
    externalMappings: ['en:nuts', 'en:dried-fruits', 'en:shelled-fruits', 'en:almonds', 'en:cashew-nuts'],
    subcategories: [
      { name: 'Almonds, Cashews & Pista', slug: 'almonds-cashews-pista', aliases: ['kaju', 'cashew', 'badam', 'almond', 'pista', 'pistachio'] },
      { name: 'Raisins, Dates & Figs', slug: 'raisins-dates-figs', aliases: ['kishmish', 'raisins', 'khajoor', 'dates', 'anjeer', 'figs'] },
      { name: 'Walnuts & Edible Seeds', slug: 'walnuts-seeds', aliases: ['akhrot', 'walnut', 'chia seeds', 'flax seeds', 'pumpkin seeds', 'sunflower seeds'] }
    ]
  },
  {
    name: 'Health & Nutrition',
    slug: 'health-nutrition',
    icon: 'HeartPulse',
    displayOrder: 19,
    aliases: ['health', 'nutrition', 'horlicks', 'bournvita', 'boost', 'complan', 'protein', 'chyawanprash', 'glucose', 'supplement', 'supplements'],
    externalMappings: ['en:dietary-supplements', 'en:nutrition-powders'],
    subcategories: [
      { name: 'Health Drink Powders', slug: 'health-drink-powders', aliases: ['horlicks', 'bournvita', 'boost', 'complan', 'ensure', 'malt drink'] },
      { name: 'Ayurvedic & Immunity', slug: 'ayurvedic-immunity', aliases: ['chyawanprash', 'dabur chyawanprash', 'giloy', 'ashwagandha', 'triphala', 'isabgol'] },
      { name: 'Protein & Energy Supplements', slug: 'protein-energy', aliases: ['protein powder', 'glucon d', 'glucose powder', 'ors', 'energy powder'] }
    ]
  },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    icon: 'Sparkles',
    displayOrder: 20,
    aliases: ['personal care', 'soap', 'soaps', 'shampoo', 'toothpaste', 'toothbrush', 'colgate', 'dettol', 'lifebuoy', 'lux', 'dove', 'shaving', 'handwash'],
    externalMappings: ['en:personal-care', 'en:soaps', 'en:shampoos', 'en:oral-hygiene', 'en:toothpastes'],
    subcategories: [
      { name: 'Bathing Soaps & Bodywash', slug: 'bathing-soaps', aliases: ['soap', 'bathing soap', 'dettol soap', 'lifebuoy soap', 'dove', 'lux', 'pears', 'body wash', 'shower gel', 'santoor'] },
      { name: 'Oral Care', slug: 'oral-care', aliases: ['toothpaste', 'colgate', 'close up', 'pepsodent', 'sensodyne', 'dabur red', 'meswak', 'toothbrush', 'mouthwash'] },
      { name: 'Hair Care', slug: 'hair-care', aliases: ['shampoo', 'head shoulders', 'clinic plus', 'pantene', 'sunsilk', 'dove shampoo', 'conditioner'] },
      { name: 'Handwash & Sanitizers', slug: 'handwash-sanitizers', aliases: ['handwash', 'dettol handwash', 'lifebuoy handwash', 'liquid soap', 'sanitizer'] },
      { name: 'Shaving & Men Grooming', slug: 'shaving-grooming', aliases: ['shaving cream', 'gillette', 'razor', 'shaving foam', 'aftershave', 'blade'] }
    ]
  },
  {
    name: 'Beauty & Cosmetics',
    slug: 'beauty-cosmetics',
    icon: 'Smile',
    displayOrder: 21,
    aliases: ['beauty', 'cosmetics', 'face wash', 'cream', 'creams', 'lotion', 'powder', 'talc', 'hair oil', 'ponds', 'fair lovely', 'vaseline', 'parachute'],
    externalMappings: ['en:cosmetics', 'en:skin-care', 'en:creams', 'en:lotions'],
    subcategories: [
      { name: 'Face Care & Cleansers', slug: 'face-care', aliases: ['face wash', 'garnier', 'himalaya face wash', 'clean clear', 'face scrub', 'face cream', 'glow lovely'] },
      { name: 'Skin Creams & Body Lotions', slug: 'creams-lotions', aliases: ['body lotion', 'vaseline', 'nivea', 'ponds cream', 'cold cream', 'moisturizer', 'sunscreen'] },
      { name: 'Hair Oils', slug: 'hair-oils', aliases: ['hair oil', 'parachute coconut oil', 'bajaj almond drops', 'dabur amla', 'navratna tel', 'castor oil'] },
      { name: 'Talcum Powders & Deos', slug: 'talc-deos', aliases: ['talcum powder', 'ponds powder', 'dermicool', 'navratna cool', 'deodorant', 'body spray', 'axe', 'fogg', 'nivea deo'] }
    ]
  },
  {
    name: 'Household Cleaning',
    slug: 'household-cleaning',
    icon: 'SprayCan',
    displayOrder: 22,
    aliases: ['cleaning', 'detergent', 'surf', 'surf excel', 'tide', 'rin', 'aerial', 'dishwash', 'vim', 'harpic', 'lizol', 'colin', 'floor cleaner'],
    externalMappings: ['en:cleaning-products', 'en:detergents', 'en:dishwashing-products'],
    subcategories: [
      { name: 'Laundry Detergents & Powders', slug: 'laundry-detergents', aliases: ['surf excel', 'tide', 'ariel', 'rin', 'ghari', 'wheel', 'washing powder', 'detergent powder'] },
      { name: 'Detergent Bars & Liquids', slug: 'detergent-bars-liquids', aliases: ['detergent bar', 'rin bar', 'surf excel liquid', 'comfort', 'fabric conditioner', 'vanish'] },
      { name: 'Dishwash Bars & Gels', slug: 'dishwash', aliases: ['vim bar', 'vim gel', 'pril', 'exo dishwash', 'dishwash liquid'] },
      { name: 'Toilet & Surface Cleaners', slug: 'toilet-surface-cleaners', aliases: ['harpic', 'toilet cleaner', 'lizol', 'floor cleaner', 'colin', 'glass cleaner', 'domex'] }
    ]
  },
  {
    name: 'Baby Care',
    slug: 'baby-care',
    icon: 'Baby',
    displayOrder: 23,
    aliases: ['baby', 'baby care', 'diaper', 'diapers', 'pampers', 'mamy poko', 'huggies', 'wipes', 'cerelac', 'johnson baby'],
    externalMappings: ['en:baby-foods', 'en:diapers', 'en:baby-care'],
    subcategories: [
      { name: 'Diapers & Pants', slug: 'diapers-pants', aliases: ['pampers', 'mamy poko pants', 'huggies', 'baby diaper', 'diaper pants'] },
      { name: 'Baby Wipes & Skincare', slug: 'baby-wipes-skincare', aliases: ['baby wipes', 'johnson baby powder', 'baby soap', 'baby shampoo', 'baby oil', 'himalaya baby'] },
      { name: 'Baby Food & Formula', slug: 'baby-food-formula', aliases: ['cerelac', 'nestle lactogen', 'nestum', 'baby cereal', 'formula milk'] }
    ]
  },
  {
    name: 'Feminine Hygiene',
    slug: 'feminine-hygiene',
    icon: 'Shield',
    displayOrder: 24,
    aliases: ['feminine', 'sanitary pads', 'whisper', 'stayfree', 'sofy', 'pads', 'napkins', 'intimate wash'],
    externalMappings: ['en:feminine-hygiene', 'en:sanitary-towels'],
    subcategories: [
      { name: 'Sanitary Pads & Napkins', slug: 'sanitary-pads', aliases: ['whisper', 'stayfree', 'sofy', 'sanitary napkin', 'xl pads', 'sanitary pads'] },
      { name: 'Intimate Care', slug: 'intimate-care', aliases: ['vwash', 'intimate wash', 'panty liners', 'tampons'] }
    ]
  },
  {
    name: 'Paper & Hygiene',
    slug: 'paper-hygiene',
    icon: 'FileText',
    displayOrder: 25,
    aliases: ['paper', 'tissues', 'tissue paper', 'napkins', 'toilet roll', 'kitchen roll', 'wet wipes'],
    externalMappings: ['en:paper-products', 'en:hygiene'],
    subcategories: [
      { name: 'Facial Tissues & Napkins', slug: 'tissues-napkins', aliases: ['tissue box', 'paper napkins', 'facial tissue', 'car tissue'] },
      { name: 'Kitchen & Toilet Rolls', slug: 'kitchen-toilet-rolls', aliases: ['toilet roll', 'toilet paper', 'kitchen towel roll', 'absorbent paper'] }
    ]
  },
  {
    name: 'Kitchen & Home',
    slug: 'kitchen-home',
    icon: 'Home',
    displayOrder: 26,
    aliases: ['kitchen', 'home', 'foil', 'aluminium foil', 'garbage bag', 'scrubber', 'scotch brite', 'broom', 'mop', 'matchbox'],
    externalMappings: ['en:kitchen-supplies'],
    subcategories: [
      { name: 'Foils & Wraps', slug: 'foils-wraps', aliases: ['aluminium foil', 'freshwrapp', 'cling film', 'food wrap paper'] },
      { name: 'Garbage Bags & Bins', slug: 'garbage-bags', aliases: ['dustbin bags', 'garbage bags', 'black garbage bag', 'trash bag'] },
      { name: 'Scrubbers, Brooms & Mops', slug: 'scrubbers-mops', aliases: ['scotch brite', 'steel scrubber', 'sponge wipe', 'broom', 'jhadu', 'pocha', 'mop', 'floor wiper'] },
      { name: 'Matches & Lighters', slug: 'matches-lighters', aliases: ['matchbox', 'gas lighter', 'kitchen lighter', 'candle', 'candles'] }
    ]
  },
  {
    name: 'Plastic & Storage',
    slug: 'plastic-storage',
    icon: 'Box',
    displayOrder: 27,
    aliases: ['plastic', 'storage', 'containers', 'bottles', 'water bottle', 'lunch box', 'bucket', 'tub'],
    externalMappings: ['en:storage-containers'],
    subcategories: [
      { name: 'Containers & Jars', slug: 'containers-jars', aliases: ['plastic container', 'storage jar', 'airtight container', 'spice rack'] },
      { name: 'Bottles & Lunch Boxes', slug: 'bottles-lunch-boxes', aliases: ['water bottle', 'milton bottle', 'lunch box', 'tiffin', 'flask'] }
    ]
  },
  {
    name: 'Stationery',
    slug: 'stationery',
    icon: 'PenTool',
    displayOrder: 28,
    aliases: ['stationery', 'pen', 'pencil', 'notebook', 'register', 'fevicol', 'fevikwik', 'glue', 'tape', 'scissors'],
    externalMappings: ['en:stationery'],
    subcategories: [
      { name: 'Pens, Pencils & Erasers', slug: 'pens-pencils', aliases: ['ball pen', 'gel pen', 'pencil', 'apsara', 'natraj', 'eraser', 'sharpener', 'marker'] },
      { name: 'Notebooks & Registers', slug: 'notebooks-registers', aliases: ['notebook', 'copy', 'long register', 'sticky notes', 'drawing book'] },
      { name: 'Adhesives & Tapes', slug: 'adhesives-tapes', aliases: ['fevicol', 'fevikwik', 'glue stick', 'cello tape', 'brown tape', 'scissors'] }
    ]
  },
  {
    name: 'Electrical Accessories',
    slug: 'electrical-accessories',
    icon: 'Zap',
    displayOrder: 29,
    aliases: ['electrical', 'battery', 'batteries', 'duracell', 'eveready', 'bulb', 'led', 'all out', 'good knight', 'mosquito repellent'],
    externalMappings: ['en:electrical'],
    subcategories: [
      { name: 'Batteries', slug: 'batteries', aliases: ['aa battery', 'aaa battery', 'duracell', 'eveready', 'pencil cell', '9v battery'] },
      { name: 'Bulbs & Torches', slug: 'bulbs-torches', aliases: ['led bulb', 'philips bulb', 'night lamp', 'torch cell'] },
      { name: 'Mosquito Repellents', slug: 'mosquito-repellents', aliases: ['all out', 'good knight', 'refill', 'mosquito bat', 'coil', 'mortein', 'repellent machine'] }
    ]
  },
  {
    name: 'Pet Care',
    slug: 'pet-care',
    icon: 'Dog',
    displayOrder: 30,
    aliases: ['pet', 'dog food', 'cat food', 'pedigree', 'whiskas', 'drools', 'dog treats'],
    externalMappings: ['en:pet-foods', 'en:dog-foods', 'en:cat-foods'],
    subcategories: [
      { name: 'Dog Food & Treats', slug: 'dog-food', aliases: ['pedigree', 'drools', 'dog biscuits', 'chew bones', 'puppy food'] },
      { name: 'Cat Food & Pet Grooming', slug: 'cat-food-grooming', aliases: ['whiskas', 'cat food', 'pet shampoo', 'cat treats'] }
    ]
  },
  {
    name: 'Pooja Essentials',
    slug: 'pooja-essentials',
    icon: 'Sun',
    displayOrder: 31,
    aliases: ['pooja', 'puja', 'agarbatti', 'dhoop', 'camphor', 'kapoor', 'batti', 'diya', 'kumkum', 'chandan', 'cycle agarbatti'],
    externalMappings: ['en:pooja'],
    subcategories: [
      { name: 'Agarbatti & Dhoop', slug: 'agarbatti-dhoop', aliases: ['agarbatti', 'incense sticks', 'cycle pure', 'mangaldeep', 'zed black', 'dhoop sticks', 'dhoop cones'] },
      { name: 'Camphor, Wicks & Oil', slug: 'camphor-wicks-oil', aliases: ['camphor', 'kapoor', 'cotton wicks', 'batti', 'pooja oil', 'diya batti', 'ghee diya'] }
    ]
  },
  {
    name: 'Seasonal Products',
    slug: 'seasonal-products',
    icon: 'Calendar',
    displayOrder: 32,
    aliases: ['seasonal', 'summer', 'winter', 'monsoon', 'umbrella', 'raincoat', 'diya', 'gulal', 'festive'],
    externalMappings: ['en:seasonal'],
    subcategories: [
      { name: 'Summer & Winter Items', slug: 'summer-winter', aliases: ['glucose powder', 'prickly heat powder', 'cold cream', 'lip balm', 'vaseline jar'] },
      { name: 'Festival & Seasonal Gear', slug: 'festival-gear', aliases: ['diya', 'rangoli colors', 'holi gulal', 'rakhi', 'umbrella', 'raincoat'] }
    ]
  },
  {
    name: 'Others',
    slug: 'others',
    icon: 'Layers',
    displayOrder: 33,
    aliases: ['others', 'general', 'misc', 'miscellaneous', 'unknown', 'pending'],
    externalMappings: [],
    subcategories: [
      { name: 'General Others', slug: 'general-others', aliases: ['general', 'miscellaneous', 'other items', 'mixed'] },
      { name: 'Uncategorized Products', slug: 'uncategorized', aliases: ['uncategorized', 'pending classification', 'to review'] }
    ]
  }
];
