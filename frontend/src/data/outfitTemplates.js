export const outfitTemplates = [
  {
    id: 'day-ease',
    label: 'Day Ease',
    required: ['top', 'bottom', 'footwear'],
    optional: ['outerwear', 'accessory'],
    mood: 'easy and light',
    contexts: ['workday', 'weekend', 'casual'],
  },
  {
    id: 'city-formal',
    label: 'City Formal',
    required: ['top', 'bottom', 'footwear'],
    optional: ['outerwear', 'accessory'],
    mood: 'structured and polished',
    contexts: ['formal', 'evening', 'meeting'],
  },
  {
    id: 'weekend-creative',
    label: 'Weekend Creative',
    required: ['top', 'bottom', 'footwear'],
    optional: ['accessory'],
    mood: 'playful and expressive',
    contexts: ['weekend', 'brunch', 'casual'],
  },
]
