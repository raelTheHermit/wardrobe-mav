export const aestheticOptions = [
  { id: 'clean', label: 'Clean Minimal', description: 'Neutral, refined, and easy layers.' },
  { id: 'classic', label: 'Classic', description: 'Timeless shapes and dependable staples.' },
  { id: 'warm', label: 'Warm Earth', description: 'Organic tones and casual ease.' },
  { id: 'romantic', label: 'Romantic', description: 'Soft contrasts and elegant mood.' },
  { id: 'edgy', label: 'Edgy', description: 'Sharper silhouettes with darker accents.' },
  { id: 'creative', label: 'Creative', description: 'Playful and expressive combinations.' },
]

export function getAestheticSummary(aestheticId) {
  const match = aestheticOptions.find((option) => option.id === aestheticId)
  return match || aestheticOptions[0]
}
