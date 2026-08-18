// Common supermarket items, English display name + Spanish alias so you can
// search either way (e.g. typing "leche" finds "Milk"). Not exhaustive —
// anything missing can still be typed and added manually.
export const GROCERY_ITEMS = [
  // Fruit & veg
  { name: 'Bananas', es: 'plátanos' }, { name: 'Apples', es: 'manzanas' },
  { name: 'Oranges', es: 'naranjas' }, { name: 'Lemons', es: 'limones' },
  { name: 'Strawberries', es: 'fresas' }, { name: 'Grapes', es: 'uvas' },
  { name: 'Melon', es: 'melón' }, { name: 'Watermelon', es: 'sandía' },
  { name: 'Pear', es: 'pera' }, { name: 'Peach', es: 'melocotón' },
  { name: 'Kiwi', es: 'kiwi' }, { name: 'Pineapple', es: 'piña' },
  { name: 'Mandarins', es: 'mandarinas' }, { name: 'Cherries', es: 'cerezas' },
  { name: 'Tomatoes', es: 'tomates' }, { name: 'Cherry tomatoes', es: 'tomate cherry' },
  { name: 'Potatoes', es: 'patatas' }, { name: 'Onions', es: 'cebollas' },
  { name: 'Garlic', es: 'ajo' }, { name: 'Carrots', es: 'zanahorias' },
  { name: 'Lettuce', es: 'lechuga' }, { name: 'Spinach', es: 'espinacas' },
  { name: 'Peppers', es: 'pimientos' }, { name: 'Cucumber', es: 'pepino' },
  { name: 'Courgette', es: 'calabacín' }, { name: 'Aubergine', es: 'berenjena' },
  { name: 'Broccoli', es: 'brócoli' }, { name: 'Cauliflower', es: 'coliflor' },
  { name: 'Mushrooms', es: 'champiñones' }, { name: 'Avocado', es: 'aguacate' },
  { name: 'Green beans', es: 'judías verdes' }, { name: 'Leek', es: 'puerro' },
  { name: 'Celery', es: 'apio' }, { name: 'Pumpkin', es: 'calabaza' },
  { name: 'Corn', es: 'maíz' }, { name: 'Fresh herbs', es: 'hierbas frescas' },
  { name: 'Parsley', es: 'perejil' }, { name: 'Ginger', es: 'jengibre' },

  // Dairy & eggs
  { name: 'Milk', es: 'leche' }, { name: 'Eggs', es: 'huevos' },
  { name: 'Butter', es: 'mantequilla' }, { name: 'Yogurt', es: 'yogur' },
  { name: 'Cheese', es: 'queso' }, { name: 'Cream', es: 'nata' },
  { name: 'Manchego', es: 'queso manchego' }, { name: 'Cream cheese', es: 'queso crema' },
  { name: 'Grated cheese', es: 'queso rallado' }, { name: 'Sliced cheese', es: 'queso en lonchas' },
  { name: 'Fresh cheese', es: 'queso fresco' }, { name: 'Custard', es: 'natillas' },
  { name: 'Flan', es: 'flan' },

  // Bakery
  { name: 'Bread', es: 'pan' }, { name: 'Baguette', es: 'barra de pan' },
  { name: 'Wholemeal bread', es: 'pan integral' }, { name: 'Tortillas (wraps)', es: 'tortillas de trigo' },
  { name: 'Croissants', es: 'croissants' }, { name: 'Toast bread', es: 'pan de molde' },
  { name: 'Pastries', es: 'bollería' }, { name: 'Muffins', es: 'magdalenas' },

  // Meat & fish
  { name: 'Chicken', es: 'pollo' }, { name: 'Chicken breast', es: 'pechuga de pollo' },
  { name: 'Chicken thighs', es: 'muslos de pollo' }, { name: 'Minced meat', es: 'carne picada' },
  { name: 'Beef', es: 'ternera' }, { name: 'Pork', es: 'cerdo' },
  { name: 'Pork loin', es: 'lomo de cerdo' }, { name: 'Bacon', es: 'bacon' },
  { name: 'Ham', es: 'jamón cocido' }, { name: 'Serrano ham', es: 'jamón serrano' },
  { name: 'Chorizo', es: 'chorizo' }, { name: 'Salami', es: 'salami' },
  { name: 'Sausages', es: 'salchichas' }, { name: 'Meatballs', es: 'albóndigas' },
  { name: 'Salmon', es: 'salmón' }, { name: 'Tuna (fresh)', es: 'atún fresco' },
  { name: 'Prawns', es: 'gambas' }, { name: 'Cod', es: 'bacalao' },
  { name: 'Hake', es: 'merluza' }, { name: 'Mussels', es: 'mejillones' },
  { name: 'Squid', es: 'calamares' },

  // Pantry / staples
  { name: 'Rice', es: 'arroz' }, { name: 'Pasta', es: 'pasta' },
  { name: 'Spaghetti', es: 'espaguetis' }, { name: 'Flour', es: 'harina' },
  { name: 'Sugar', es: 'azúcar' }, { name: 'Salt', es: 'sal' },
  { name: 'Olive oil', es: 'aceite de oliva' }, { name: 'Sunflower oil', es: 'aceite de girasol' },
  { name: 'Vinegar', es: 'vinagre' }, { name: 'Tomato sauce', es: 'tomate frito' },
  { name: 'Canned tomatoes', es: 'tomate triturado' }, { name: 'Chickpeas', es: 'garbanzos' },
  { name: 'Lentils', es: 'lentejas' }, { name: 'Beans', es: 'alubias' },
  { name: 'Canned tuna', es: 'atún en lata' }, { name: 'Olives', es: 'aceitunas' },
  { name: 'Cereal', es: 'cereales' }, { name: 'Oats', es: 'avena' },
  { name: 'Honey', es: 'miel' }, { name: 'Jam', es: 'mermelada' },
  { name: 'Peanut butter', es: 'mantequilla de cacahuete' }, { name: 'Nutella', es: 'nocilla' },
  { name: 'Coffee', es: 'café' }, { name: 'Tea', es: 'té' },
  { name: 'Cocoa', es: 'cacao' }, { name: 'Mayonnaise', es: 'mayonesa' },
  { name: 'Ketchup', es: 'ketchup' }, { name: 'Mustard', es: 'mostaza' },
  { name: 'Stock cubes', es: 'pastillas de caldo' }, { name: 'Spices', es: 'especias' },
  { name: 'Breadcrumbs', es: 'pan rallado' }, { name: 'Gazpacho', es: 'gazpacho' },
  { name: 'Hummus', es: 'hummus' }, { name: 'Soup', es: 'sopa' },

  // Snacks & sweets
  { name: 'Chips', es: 'patatas fritas de bolsa' }, { name: 'Crisps', es: 'patatas fritas' },
  { name: 'Chocolate', es: 'chocolate' }, { name: 'Biscuits', es: 'galletas' },
  { name: 'Cookies', es: 'cookies' }, { name: 'Nuts', es: 'frutos secos' },
  { name: 'Almonds', es: 'almendras' }, { name: 'Popcorn', es: 'palomitas' },
  { name: 'Ice cream', es: 'helado' }, { name: 'Candy', es: 'chuches' },
  { name: 'Churros', es: 'churros' },

  // Drinks
  { name: 'Water', es: 'agua' }, { name: 'Sparkling water', es: 'agua con gas' },
  { name: 'Orange juice', es: 'zumo de naranja' }, { name: 'Soft drinks', es: 'refrescos' },
  { name: 'Cola', es: 'cola' }, { name: 'Beer', es: 'cerveza' },
  { name: 'Wine', es: 'vino' }, { name: 'Energy drink', es: 'bebida energética' },
  { name: 'Sangria', es: 'sangría' }, { name: 'Vermouth', es: 'vermú' },

  // Frozen
  { name: 'Frozen pizza', es: 'pizza congelada' }, { name: 'Frozen vegetables', es: 'verdura congelada' },
  { name: 'Frozen chips', es: 'patatas congeladas' }, { name: 'Frozen fish', es: 'pescado congelado' },
  { name: 'Frozen croquettes', es: 'croquetas congeladas' },

  // Household
  { name: 'Toilet paper', es: 'papel higiénico' }, { name: 'Kitchen roll', es: 'papel de cocina' },
  { name: 'Napkins', es: 'servilletas' }, { name: 'Dish soap', es: 'lavavajillas' },
  { name: 'Laundry detergent', es: 'detergente' }, { name: 'Fabric softener', es: 'suavizante' },
  { name: 'Bin bags', es: 'bolsas de basura' }, { name: 'Bleach', es: 'lejía' },
  { name: 'Cleaning spray', es: 'limpiador multiusos' }, { name: 'Sponges', es: 'estropajos' },
  { name: 'Aluminium foil', es: 'papel de aluminio' }, { name: 'Cling film', es: 'film transparente' },
  { name: 'Air freshener', es: 'ambientador' }, { name: 'Light bulbs', es: 'bombillas' },
  { name: 'Batteries', es: 'pilas' },

  // Personal care
  { name: 'Shampoo', es: 'champú' }, { name: 'Conditioner', es: 'acondicionador' },
  { name: 'Shower gel', es: 'gel de ducha' }, { name: 'Soap', es: 'jabón' },
  { name: 'Toothpaste', es: 'pasta de dientes' }, { name: 'Toothbrush', es: 'cepillo de dientes' },
  { name: 'Deodorant', es: 'desodorante' }, { name: 'Razor', es: 'cuchilla de afeitar' },
  { name: 'Shaving foam', es: 'espuma de afeitar' }, { name: 'Moisturiser', es: 'crema hidratante' },
  { name: 'Sunscreen', es: 'protector solar' }, { name: 'Hand cream', es: 'crema de manos' },
  { name: 'Cotton pads', es: 'discos desmaquillantes' }, { name: 'Tampons', es: 'tampones' },
  { name: 'Pads', es: 'compresas' }, { name: 'Tissues', es: 'pañuelos de papel' },
  { name: 'Hand sanitiser', es: 'gel hidroalcohólico' }, { name: 'Painkillers', es: 'analgésicos' },
  { name: 'Plasters', es: 'tiritas' },

  // Baby / pet
  { name: 'Diapers', es: 'pañales' }, { name: 'Baby wipes', es: 'toallitas' },
  { name: 'Baby formula', es: 'leche de fórmula' }, { name: 'Dog food', es: 'comida para perro' },
  { name: 'Cat food', es: 'comida para gato' }, { name: 'Cat litter', es: 'arena para gato' },
]

// Broad catch-alls, tried only when nothing more specific above matches (see
// `canonicalizeGroceryName`) — so a receipt line the scan read as "carne
// picada extra 500g" still lands as one recognisable thing instead of a
// one-off nobody's seen before.
const GROCERY_FALLBACKS = [
  { name: 'Meat', es: 'carne' }, { name: 'Fish', es: 'pescado' },
  { name: 'Deli meats', es: 'embutido' }, { name: 'Vegetables', es: 'verdura' },
  { name: 'Fruit', es: 'fruta' }, { name: 'Soft drinks', es: 'gaseosa' },
]

// Longest alias first, so "queso manchego" is checked — and wins — before
// the bare "queso" that would otherwise swallow it, and specific items
// (Salmon, Chorizo…) win before the generic fallbacks below them.
const MATCHERS = [...GROCERY_ITEMS, ...GROCERY_FALLBACKS].sort(
  (a, b) => Math.max(b.name.length, b.es.length) - Math.max(a.name.length, a.es.length)
)

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

// A scan reading the same product two different ways ("Queso manchego
// curado 250g" one week, "QUESO MANCHEGO" the next) used to produce two
// unrelated lines in "what you bought" — every purchase looked like the
// first time. Matching each raw line against the same item/alias list the
// manual picker uses folds them back into one recognisable thing, English
// or Spanish, generic family or specific product.
export function canonicalizeGroceryName(raw) {
  if (!raw) return raw
  const t = norm(raw)
  for (const item of MATCHERS) {
    if (t.includes(norm(item.es)) || t.includes(norm(item.name))) return item.name
  }
  return raw.trim()
}
