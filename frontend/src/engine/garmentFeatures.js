// One place that turns a raw garment (legacy form data, API data, AI-tagged data) into the
// numbers the scorers use. Every scorer reads from here, so they all agree on what
// "formality", "color" or "volume" mean. Results are cached per garment object.
import { scoringConfig as C } from "../data/scoringConfig.js";

export const lc = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
export const clamp01 = (n) => Math.min(1, Math.max(0, n));
export const round = (n, digits = 3) => Number(Number(n).toFixed(digits));
export const mean = (values) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

export function symmetricLookup(table, a, b) {
  const x = table?.[a]?.[b];
  const y = table?.[b]?.[a];
  if (x !== undefined && y !== undefined) return (x + y) / 2;
  return x ?? y ?? null;
}

// ---------------------------------------------------------------- family
const FAMILY_WORDS = {
  footwear: [
    "shoe",
    "shoes",
    "footwear",
    "sneaker",
    "sneakers",
    "boot",
    "boots",
    "sandal",
    "sandals",
    "loafer",
    "loafers",
  ],
  top: ["top", "tops", "shirt", "tee", "sweater", "knitwear"],
  bottom: [
    "bottom",
    "bottoms",
    "pants",
    "trousers",
    "shorts",
    "skirt",
    "jeans",
  ],
  outerwear: ["outerwear", "jacket", "coat", "layer"],
  accessory: [
    "accessory",
    "accessories",
    "scarf",
    "hat",
    "belt",
    "bag",
    "jewelry",
    "jewellery",
  ],
  onepiece: [
    "onepiece",
    "one-piece",
    "one_piece",
    "dress",
    "jumpsuit",
    "romper",
    "gown",
  ],
};
const KNOWN_FAMILIES = new Set(Object.keys(FAMILY_WORDS));

export function normalizeFamily(value) {
  const word = lc(value);
  if (!word) return null;
  for (const [family, words] of Object.entries(FAMILY_WORDS))
    if (words.includes(word)) return family;
  return word;
}

const FAMILY_FROM_TEXT = [
  ["onepiece", /\b(dress|jumpsuit|gown|romper|abaya)\b/],
  [
    "top",
    /\b(tunic|dashiki|kaftan|agbada|senator|shirt|top|tee|polo|henley|sweater|blouse|hoodie)\b/,
  ],
  [
    "bottom",
    /\b(trousers?|pants|shorts|chinos?|jeans|skirt|sweatpants|joggers?|leggings)\b/,
  ],
  ["outerwear", /\b(jacket|coat|blazer|cardigan|parka|windbreaker)\b/],
  [
    "footwear",
    /\b(sneakers?|shoes?|loafers?|boots?|sandals?|slippers?|heels?)\b/,
  ],
  ["accessory", /\b(scarf|hat|cap|belt|bag|watch|gloves?|beanie|tie)\b/],
];

export function familyOf(item) {
  if (!item || typeof item !== "object") return null;
  const raw =
    typeof item.category === "object" ? item.category?.family : item.category;
  const family = normalizeFamily(raw || item.type);
  if (family && KNOWN_FAMILIES.has(family)) return family;
  // Unknown categories such as "traditional_wear": decide from the name.
  const text = lc(
    `${item.name ?? ""} ${item.type ?? ""} ${item.subtype ?? ""}`,
  );
  for (const [fam, pattern] of FAMILY_FROM_TEXT)
    if (pattern.test(text)) return fam;
  return null;
}

// ---------------------------------------------------------------- color
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h =
      max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, l };
}

const NEUTRALS = new Set(C.neutralColors);

function buildColor(name, hex, { dark = false, light = false } = {}) {
  const hsl = hexToHsl(hex);
  if (dark) hsl.l *= 0.7;
  if (light) hsl.l += (1 - hsl.l) * 0.45;
  const neutral =
    NEUTRALS.has(name) || hsl.s < 0.12 || hsl.l < 0.1 || hsl.l > 0.92;
  return {
    name,
    family: C.colorPalette[name]?.family ?? name,
    ...hsl,
    neutral,
  };
}

const UNKNOWN_COLOR = new Set([
  "unknown",
  "varied",
  "multi",
  "multicolor",
  "multi color",
  "multicolour",
  "multicolored",
  "mixed",
  "n/a",
  "none",
]);
const PLACEHOLDER_HEX = "#d9d9d9"; // what the add-garment form fills in when no color is picked

export function resolveColor(raw) {
  const text = lc(raw).replace(/_/g, " ");
  if (!text) return null;
  if (/^#[0-9a-f]{6}$/.test(text))
    return { ...buildColor("custom", text), family: "custom" };
  const phrase = text.replace(/-/g, " ").replace(/\s+/g, " ");
  if (UNKNOWN_COLOR.has(phrase)) return null;

  const direct =
    C.colorAliases[phrase] || (C.colorPalette[phrase] ? phrase : null);
  if (direct) return buildColor(direct, C.colorPalette[direct].hex);

  let dark = false;
  let light = false;
  let base = null;
  for (const token of phrase.split(" ")) {
    if (["dark", "deep", "darker"].includes(token)) {
      dark = true;
      continue;
    }
    if (["light", "pale", "pastel", "soft", "baby"].includes(token)) {
      light = true;
      continue;
    }
    const name =
      C.colorAliases[token] || (C.colorPalette[token] ? token : null);
    if (name && !base) base = name;
  }
  return base
    ? buildColor(base, C.colorPalette[base].hex, { dark, light })
    : null;
}

// Pulls color words out of a garment name ("Green and Black Plaid Winter Scarf").
function colorsFromName(name) {
  const tokens = lc(name)
    .replace(/[^a-z\s-]/g, " ")
    .split(/[\s]+/)
    .filter(Boolean);
  const found = [];
  let pending = "";
  for (const token of tokens) {
    if (["dark", "deep", "light", "pale"].includes(token)) {
      pending = token;
      continue;
    }
    const color = resolveColor(pending ? `${pending} ${token}` : token);
    pending = "";
    if (color && !found.some((c) => c.name === color.name)) found.push(color);
  }
  return found;
}

function colorsOf(item) {
  const attrs = item.visual_attributes || {};
  const entries = [
    ...(attrs.primary_colors || []).map((c) => [c, 1]),
    ...(attrs.secondary_colors || []).map((c) => [c, 0.4]),
  ];
  if (!entries.length) {
    const legacy = item.color || item.baseColor || item.primary_color;
    if (legacy) entries.push([legacy, 1]);
  }
  let colors = entries
    .map(([c, w]) => {
      const r = resolveColor(c);
      return r && { ...r, w };
    })
    .filter(Boolean);

  // Stored colors often list only one color for a two-color piece; trust the name if it says more.
  const fromName = colorsFromName(item.name);
  if (fromName.length > colors.length)
    colors = fromName.map((c, i) => ({ ...c, w: i === 0 ? 1 : 0.7 }));

  if (
    !colors.length &&
    /^#[0-9a-f]{6}$/i.test(item.hex || "") &&
    item.hex.toLowerCase() !== PLACEHOLDER_HEX
  ) {
    colors = [{ ...resolveColor(item.hex.toLowerCase()), w: 1 }];
  }
  return colors;
}

// ---------------------------------------------------------------- pattern
export function normalizePattern(raw) {
  const text = lc(raw);
  if (!text || text === "unknown") return null;
  if (/stripe/.test(text)) return "striped";
  if (/plaid|check|gingham|tartan/.test(text)) return "checked";
  if (/floral|flower|tropical/.test(text)) return "floral";
  if (
    /print|graphic|logo|abstract|african|geometric|paisley|patterned|varied/.test(
      text,
    )
  )
    return "print";
  if (/textur|knit|rib|cable|waffle|cord/.test(text)) return "textured";
  if (/solid|plain/.test(text)) return "solid";
  return null;
}

function patternOf(item, text) {
  const declared = normalizePattern(
    item.visual_attributes?.pattern || item.pattern,
  );
  if (declared && declared !== "solid") return declared;
  // "solid" is the form default, so let an obvious name win ("Plaid Winter Scarf").
  return (
    normalizePattern(
      text.match(
        /plaid|check|gingham|tartan|stripe|floral|tropical|print|graphic|patterned|paisley|geometric/,
      )?.[0],
    ) ||
    declared ||
    "solid"
  );
}

// ---------------------------------------------------------------- formality
function inferFormality(text) {
  const hits = C.formalityKeywords
    .filter(([pattern]) => pattern.test(text))
    .map(([, value]) => value);
  return hits.length ? mean(hits.slice(0, 3)) : null;
}

function formalityOf(item, text) {
  const attrs = item.attributes || {};
  let value = attrs.formality_estimate ?? attrs.formality ?? item.formality;
  value =
    typeof value === "number" && Number.isFinite(value)
      ? clamp01(value > 1 ? value / 5 : value)
      : null;
  // 0.5 is what the add form writes when nobody chose, so treat it as "unknown" and infer.
  if (value === null || value === 0.5)
    return inferFormality(text) ?? value ?? 0.5;
  return value;
}

// ---------------------------------------------------------------- climate
function cueScore(cues, text) {
  let best = 0;
  for (const [pattern, value] of cues)
    if (pattern.test(text)) best = Math.max(best, value);
  return best;
}

function climateOf(text, tags) {
  const has = (...names) => names.some((n) => tags.includes(n));
  return {
    warm: has("hot_weather", "summer") ? 1 : cueScore(C.warmCues, text),
    cold: has("cold_weather", "winter") ? 1 : cueScore(C.coldCues, text),
    rain: has("rain_protection") ? 1 : cueScore(C.rainCues, text),
  };
}

// ---------------------------------------------------------------- volume / length
function volumeOf(item) {
  const fp = item.fit_and_proportions || {};
  const declared = C.volumeMap[lc(fp.relative_volume || item.volume)] ?? null;
  const fromFit = C.volumeMap[lc(item.fit || fp.apparent_fit)] ?? null;
  // "medium" is the placeholder default; a specific fit such as "oversized" is better evidence.
  const placeholder =
    !fp.relative_volume ||
    ["medium", "uncertain"].includes(lc(fp.relative_volume));
  if (placeholder && fromFit !== null) return fromFit;
  return declared ?? fromFit ?? 0.5;
}

function lengthOf(item, text) {
  const declared =
    C.lengthMap[lc(item.fit_and_proportions?.relative_length || item.length)] ??
    null;
  if (declared !== null && declared !== 0.5) return declared;
  if (/\bshorts\b/.test(text)) return 0.2;
  if (/crop/.test(text)) return 0.2;
  if (/tunic|maxi|kaftan|agbada/.test(text)) return 0.78;
  return 0.5;
}

// ---------------------------------------------------------------- aesthetics / tags / material
function aestheticsOf(item) {
  const assoc = item.style_associations;
  const fromAssoc = Array.isArray(assoc)
    ? assoc
    : (assoc?.possible_aesthetics ??
      (assoc && typeof assoc === "object" ? Object.keys(assoc) : []));
  const raw = [...(fromAssoc || []), item.aesthetic, item.style].filter(
    Boolean,
  );
  return [...new Set(raw.map((a) => C.aestheticAliases[lc(a)] ?? lc(a)))];
}

function tagsOf(item) {
  const attrs = item.attributes || {};
  return [
    ...(attrs.seasonal_suitability || []),
    ...(attrs.functional_tags || []),
    ...(item.tags || []),
    item.occasion,
    item.season,
  ]
    .filter((t) => t !== undefined && t !== null && t !== "")
    .map(lc)
    .filter((t) => t !== "all" && t !== "undefined");
}

function materialOf(item) {
  return lc(
    item.material?.primary ||
      item.material ||
      item.visual_attributes?.texture ||
      "",
  );
}

// ---------------------------------------------------------------- public
const cache = new WeakMap();

export function getFeatures(item) {
  if (!item || typeof item !== "object") return null;
  const cached = cache.get(item);
  if (cached) return cached;

  const family = familyOf(item);
  const material = materialOf(item);
  const text = lc(
    `${item.name ?? ""} ${item.type ?? ""} ${item.subtype ?? ""} ${material}`,
  );
  const tags = tagsOf(item);
  const features = {
    id: item.id,
    family,
    colors: colorsOf(item),
    pattern: patternOf(item, text),
    formality: formalityOf(item, text),
    material,
    aesthetics: aestheticsOf(item),
    tags,
    climate: climateOf(text, tags),
    volume: volumeOf(item),
    length: lengthOf(item, text),
    text,
  };
  cache.set(item, features);
  return features;
}

export function countChromaticHues(features) {
  return new Set((features || []).flatMap((feature) =>
    (feature.colors || [])
      .filter((color) => !color.neutral)
      .map((color) => color.family || color.name),
  )).size;
}

export function hasProfileData(profile) {
  const m = profile?.measurements;
  if (Array.isArray(m)) return m.some((entry) => Number(entry?.value) > 0);
  return Boolean(
    m &&
    typeof m === "object" &&
    Object.values(m).some((v) => Number(v?.value ?? v) > 0),
  );
}
