/**
 * Works out sensible product details from a product name (offline, no external service).
 * Covers clothing and other kinds of products (shoes, bags, accessories, jewellery, …) and falls
 * back to a neutral "item" for anything it does not recognise. Everything is a suggestion that the
 * admin can edit.
 */
export type ProductType = 'tee' | 'polo' | 'hoodie' | 'dress' | 'trousers' | 'shorts' | 'skirt' | 'cap' | 'other';
export type Fit = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';

export interface AutofillInput {
  name: string;
  categories: string[];
  sizes: string[];
  colors: string[];
}

export interface Autofill {
  garment: ProductType;
  clothing: boolean; // true when the generated garment artwork makes sense for this product
  gender: Fit;
  category: string | null; // an existing category that fits
  suggestedCategory: string; // used when none of the existing ones fit
  material: string;
  care: string;
  tags: string;
  sizes: string[]; // wanted sizes (some may not exist yet; the form creates them)
  colors: string[]; // existing colours to tick
  kind: string; // singular word for the item, e.g. "hoodie", "sneaker"
  use: string; // short phrase used in the description opener
}

interface Kind {
  type: ProductType;
  kind: string;
  words: RegExp;
  synonyms: string[];
  plural: string;
  material: string;
  care: string;
  use: string;
  sizes?: string[];
  clothing?: boolean;
}

const CLOTHES = (k: Omit<Kind, 'clothing' | 'use'> & { use?: string }): Kind => ({ use: 'made for easy, everyday wear', ...k, clothing: true });

const KINDS: Kind[] = [
  // clothing
  CLOTHES({ type: 'hoodie', kind: 'hoodie', words: /\b(hood(ie|ies|ed)?|sweat ?shirts?|pullovers?|jumpers?|fleece|zip(-| )?up|jackets?|bombers?|windbreakers?|coats?)\b/i, synonyms: ['hood', 'sweat', 'jacket', 'outer', 'fleece'], plural: 'Hoodies & Sweatshirts', material: 'Heavyweight cotton-blend fleece', care: 'Machine wash cold, inside out. Tumble dry low.' }),
  CLOTHES({ type: 'polo', kind: 'polo shirt', words: /\bpolos?\b/i, synonyms: ['polo'], plural: 'Polos', material: '100% combed cotton piqué', care: 'Machine wash cold. Do not bleach. Iron on low heat.' }),
  CLOTHES({ type: 'dress', kind: 'dress', words: /\b(dress(es)?|gowns?|maxi|midi|kaftan|jumpsuits?)\b/i, synonyms: ['dress', 'gown'], plural: 'Dresses', material: 'Soft, breathable cotton-blend', care: 'Machine wash cold on a gentle cycle. Hang to dry.' }),
  CLOTHES({ type: 'skirt', kind: 'skirt', words: /\bskirts?\b/i, synonyms: ['skirt'], plural: 'Skirts', material: 'Soft stretch cotton-blend', care: 'Machine wash cold. Hang to dry.' }),
  CLOTHES({ type: 'shorts', kind: 'pair of shorts', words: /\b(shorts?|bermudas?)\b/i, synonyms: ['short'], plural: 'Shorts', material: 'Lightweight cotton-blend jersey', care: 'Machine wash cold. Tumble dry low.' }),
  CLOTHES({ type: 'trousers', kind: 'pair of trousers', words: /\b(trousers?|joggers?|pants?|jeans?|cargos?|chinos?|leggings?|sweatpants|track ?suits?)\b/i, synonyms: ['trouser', 'jogger', 'pant', 'bottom', 'jean'], plural: 'Trousers & Joggers', material: 'Soft cotton-blend with stretch', care: 'Machine wash cold. Tumble dry low.' }),
  CLOTHES({ type: 'tee', kind: 't-shirt', words: /\b(tees?|t-?shirts?|tops?|shirts?|tanks?|crew|singlets?|vests?|blouses?)\b/i, synonyms: ['tee', 'shirt', 'top'], plural: 'T-Shirts', material: '100% combed cotton jersey', care: 'Machine wash cold. Tumble dry low. Do not bleach.' }),
  // everything else
  { type: 'cap', kind: 'cap', words: /\b(caps?|hats?|beanies?|bucket|snapback|visor)\b/i, synonyms: ['cap', 'hat', 'headwear'], plural: 'Caps & Hats', material: 'Cotton twill with an adjustable strap', care: 'Spot clean or hand wash. Air dry.', use: 'made for easy, everyday wear', sizes: ['one size'], clothing: true },
  { type: 'other', kind: 'pair of shoes', words: /\b(shoes?|sneakers?|trainers?|sandals?|slides?|slippers?|boots?|loafers?|heels?|flats|footwear|crocs)\b/i, synonyms: ['shoe', 'sneaker', 'footwear', 'sandal', 'boot'], plural: 'Footwear', material: '', care: 'Wipe clean with a damp cloth. Air dry away from direct heat.', use: 'built for all-day comfort', sizes: ['38', '39', '40', '41', '42', '43', '44', '45'] },
  { type: 'other', kind: 'bag', words: /\b(bags?|backpacks?|handbags?|totes?|purses?|wallets?|satchels?|duffel|clutch|crossbody|luggage|suitcase)\b/i, synonyms: ['bag', 'backpack', 'wallet', 'accessor'], plural: 'Bags', material: '', care: 'Wipe clean with a damp cloth. Avoid overloading.', use: 'made to carry your day with ease', sizes: ['one size'] },
  { type: 'other', kind: 'watch', words: /\b(watch(es)?|smart ?watch|wristwatch)\b/i, synonyms: ['watch', 'accessor'], plural: 'Watches', material: '', care: 'Keep away from strong magnets and harsh chemicals. Wipe with a soft cloth.', use: 'a dependable everyday timepiece', sizes: ['one size'] },
  { type: 'other', kind: 'piece of jewellery', words: /\b(necklaces?|rings?|bracelets?|earrings?|chains?|pendants?|anklets?|bangles?|jewell?ery)\b/i, synonyms: ['jewel', 'necklace', 'ring', 'bracelet', 'accessor'], plural: 'Jewellery', material: '', care: 'Keep dry and store separately. Wipe with a soft cloth.', use: 'a finishing touch for any outfit', sizes: ['one size'] },
  { type: 'other', kind: 'accessory', words: /\b(belts?|scarf|scarves|gloves?|sunglasses|glasses|shades|ties?|bow ?tie|socks?|handkerchief|headbands?|wristbands?|keyrings?)\b/i, synonyms: ['accessor', 'belt', 'scarf', 'sock'], plural: 'Accessories', material: '', care: 'Follow the care label. Wash or wipe gently.', use: 'a small detail that completes the look', sizes: ['one size'] },
  { type: 'other', kind: 'fragrance', words: /\b(perfumes?|fragrances?|cologne|body ?spray|deodorant|lotion|body ?oil|soap|cream|serum|skincare)\b/i, synonyms: ['fragrance', 'perfume', 'beauty', 'care'], plural: 'Beauty & Fragrance', material: '', care: 'Store in a cool, dry place away from direct sunlight.', use: 'made to leave a good impression', sizes: ['one size'] },
  { type: 'other', kind: 'gadget', words: /\b(phone ?cases?|chargers?|earbuds?|earphones?|headphones?|power ?banks?|speakers?|cables?|laptop|tablet)\b/i, synonyms: ['gadget', 'tech', 'electronic', 'accessor'], plural: 'Gadgets', material: '', care: 'Keep dry and clean with a soft, dry cloth.', use: 'practical tech for everyday life', sizes: ['one size'] },
];

const stem = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (w: string) => (/(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);
const STOP = new Set(['the', 'and', 'for', 'with', 'new', 'pack', 'set', 'pro', 'max', 'mini', 'plus', 'edition']);

export function autofillFromName(input: AutofillInput): Autofill {
  const raw = input.name;
  const name = stem(raw);
  const k = KINDS.find((x) => x.words.test(raw));

  // who it is for
  let gender: Fit = 'UNISEX';
  if (/\b(kids?|child(ren)?|boys?|girls?|junior|toddler|baby)\b/i.test(raw)) gender = 'KIDS';
  else if (/\b(women'?s?|woman|ladies|lady|female|her)\b/i.test(raw)) gender = 'WOMEN';
  else if (/\b(men'?s?|man|male|gents?|him)\b/i.test(raw)) gender = 'MEN';
  else if (k && (k.type === 'dress' || k.type === 'skirt')) gender = 'WOMEN';

  const words = name.split(' ').filter((w) => w.length > 2 && !STOP.has(w));
  const lead = words[words.length - 1] ?? 'item';

  // category: an existing one that fits, otherwise a suggestion to create
  const cats = input.categories.map((c) => ({ name: c, s: stem(c) }));
  const hit = (k && cats.find((c) => k.synonyms.some((syn) => c.s.includes(syn)))) || cats.find((c) => words.some((w) => w.length > 3 && (c.s.includes(w) || w.includes(c.s.replace(/s$/, '')))));
  const suggestedCategory = k ? k.plural : title(plural(lead));

  // colours named in the product name, else a classic trio
  const have = new Map(input.colors.map((c) => [stem(c), c]));
  const named = [...have].filter(([key]) => new RegExp(`\\b${key.replace(/ /g, '\\s')}\\b`).test(name)).map(([, v]) => v);
  const fallback = ['black', 'white', 'navy', 'grey', 'gray'].map((c) => have.get(c)).filter((c): c is string => !!c).slice(0, k?.clothing === false || (k && !k.clothing) ? 2 : 3);
  const colors = named.length ? named : fallback.length ? fallback : input.colors.slice(0, 2);

  // sizes: the usual run for the item (the form creates any that do not exist yet)
  const clothing = !!k?.clothing;
  const want = k?.sizes ?? (!k ? ['one size'] : gender === 'KIDS' ? ['2-3', '4-5', '6-7', '8-9', '10-11'] : ['S', 'M', 'L', 'XL', 'XXL']);
  const bySize = new Map(input.sizes.map((s) => [s.toLowerCase(), s]));
  const oneSize = want.length === 1 && want[0] === 'one size';
  const finalSizes = oneSize
    ? [['one size', 'os', 'free size', 'onesize'].map((w) => bySize.get(w)).find(Boolean) ?? 'ONE SIZE']
    : want.map((w) => bySize.get(w.toLowerCase()) ?? w.toUpperCase());

  const kindWord = k?.kind ?? lead;
  const tags = [...new Set([...words, kindWord.replace(/^pair of /, ''), ...(gender === 'UNISEX' ? [] : [gender.toLowerCase()]), 'everyday'])].slice(0, 8).join(', ');

  return {
    garment: k?.type ?? 'other',
    clothing,
    gender,
    category: hit?.name ?? null,
    suggestedCategory,
    material: k?.material ?? '',
    care: k?.care ?? '',
    tags,
    sizes: finalSizes,
    colors,
    kind: k ? kindWord : 'item',
    use: k?.use ?? 'made to be useful every day',
  };
}
