// A template is a "vibe": which garment families it needs, plus optional rules that shape which
// outfits are generated and how well an outfit fits the vibe.
//
//   required / optional   garment families (top, bottom, onepiece, footwear, outerwear, accessory)
//   mood / contexts       for the UI; `contexts` are occasion tags, see templatesForContext()
//   rules.formality       [min, max] allowed for the core pieces (0 = very casual, 1 = very formal)
//   rules.avoid           regexes tested against a piece's name/type/material; a match excludes the outfit
//   rules.prefer          regexes (and rules.aesthetics tags) that raise the outfit's "template fit"
//   rules.maxChromatic    most distinct non-neutral hues allowed in one outfit
//   rules.maxSaturation   non-neutral colors must be at most this saturated (0..1), i.e. muted
//   rules.needsStatement  at least one loud pattern or bright color is required
//   rules.patternTolerance / hueTolerance  how much pattern / hue mixing the compatibility score tolerates
export const outfitTemplates = [
  {
    id: "day-ease",
    label: "Day Ease",
    required: ["top", "bottom", "footwear"],
    optional: ["outerwear", "accessory"],
    mood: "easy and light",
    contexts: ["workday", "weekend", "casual"],
    rules: { formality: [0, 0.65] },
  },
  {
    id: "city-formal",
    label: "City Formal",
    required: ["top", "bottom", "footwear"],
    optional: ["outerwear", "accessory"],
    mood: "structured and polished",
    contexts: ["formal", "evening", "meeting"],
    rules: {
      formality: [0.6, 1],
      avoid: [
        /\bshorts\b/,
        /sandal|flip.?flop|slides/,
        /athletic|sweatpant|jogger|hoodie|tank/,
      ],
    },
  },
  {
    id: "weekend-creative",
    label: "Weekend Creative",
    required: ["top", "bottom", "footwear"],
    optional: ["accessory"],
    mood: "playful and expressive",
    contexts: ["weekend", "brunch", "casual"],
    rules: { formality: [0, 0.7], patternTolerance: 1.6, hueTolerance: 3 },
  },
  {
    id: "alte",
    label: "Alté",
    required: ["top", "bottom", "footwear"],
    optional: ["outerwear", "accessory"],
    mood: "eclectic, experimental, unapologetically yours",
    contexts: ["weekend", "night_out", "brunch", "casual"],
    rules: {
      formality: [0, 0.65],
      needsStatement: true, // a loud print, a bold color or a deliberate clash
      patternTolerance: 2, // mixing prints is the point
      hueTolerance: 3,
      prefer: [
        /vintage|thrift|graphic|print|patterned|african|ankara|cargo|oversized|denim|mesh|bomber|boots?\b|cap\b|chain|tie.?dye|patchwork|crop|distressed|layer/,
      ],
      aesthetics: ["street", "boho", "alte", "eclectic", "traditional"],
    },
  },
  {
    id: "old-money",
    label: "Old Money",
    required: ["top", "bottom", "footwear"],
    optional: ["outerwear", "accessory"],
    mood: "quiet, tailored, timeless",
    contexts: ["workday", "brunch", "weekend", "formal"],
    rules: {
      formality: [0.45, 0.9],
      maxChromatic: 1, // at most one color outside the neutrals
      maxSaturation: 0.6, // muted, never neon
      patternTolerance: 0.6,
      hueTolerance: 1,
      avoid: [
        /graphic|logo|athletic|sweatpant|jogger|hoodie|cargo|distressed|sandal|flip.?flop|tank|\bshorts\b|multi.?colou?r|tropical|print/,
      ],
      prefer: [
        /polo|oxford|button|chino|trouser|loafer|derby|penny|cardigan|blazer|knit|sweater|linen|wool|cashmere|belt|leather/,
      ],
      aesthetics: ["classic", "minimal", "preppy"],
    },
  },
  {
    id: "one-piece",
    label: "One Piece",
    required: ["onepiece", "footwear"],
    optional: ["outerwear", "accessory"],
    mood: "effortless and complete",
    contexts: ["workday", "weekend", "casual", "formal", "evening", "brunch"],
    rules: {},
  },
];

export const getTemplate = (id) =>
  outfitTemplates.find((template) => template.id === id) || null;

// Templates whose occasion tags include the given tag, e.g. templatesForContext('brunch').
export const templatesForContext = (tag) =>
  outfitTemplates.filter((template) => template.contexts.includes(tag));
