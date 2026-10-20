import { describe, expect, it } from 'vitest'
import { generateOutfits } from '../engine/index.js'

const garments = [
  { id: 't1', name: 'Tee', category: 'top', color: 'ivory', hex: '#F3EFE7', style: 'minimal', aesthetic: 'clean', pattern: 'solid', material: 'cotton', fit: 'relaxed', silhouette: 'straight', season: 'spring', temperature: 22, occasion: 'casual', formality: 2, functionality: 3, comfort: 5, layering: 2 },
  { id: 't2', name: 'Shirt', category: 'top', color: 'navy', hex: '#1D3557', style: 'preppy', aesthetic: 'classic', pattern: 'stripe', material: 'cotton', fit: 'tailored', silhouette: 'structured', season: 'all', temperature: 20, occasion: 'smart-casual', formality: 4, functionality: 3, comfort: 4, layering: 3 },
  { id: 'b1', name: 'Pants', category: 'bottom', color: 'stone', hex: '#D9D5CF', style: 'minimal', aesthetic: 'clean', pattern: 'solid', material: 'wool', fit: 'relaxed', silhouette: 'straight', season: 'all', temperature: 19, occasion: 'smart-casual', formality: 4, functionality: 4, comfort: 4, layering: 2 },
  { id: 's1', name: 'Sneakers', category: 'shoe', color: 'white', hex: '#F5F5F3', style: 'sporty', aesthetic: 'clean', pattern: 'solid', material: 'canvas', fit: 'standard', silhouette: 'casual', season: 'summer', temperature: 27, occasion: 'casual', formality: 1, functionality: 5, comfort: 5, layering: 1 },
]

describe('ranking engine', () => {
  it('returns a sorted list of outfits with enough scores', () => {
    const outfits = generateOutfits({ garments, context: 'casual', preferences: { aesthetic: 'clean', styles: ['minimal'], colors: ['ivory'], formalityBias: 3 }, history: [] })
    expect(outfits.length).toBeGreaterThan(0)
    expect(outfits[0].score).toBeGreaterThan(0.38)
  })
})
