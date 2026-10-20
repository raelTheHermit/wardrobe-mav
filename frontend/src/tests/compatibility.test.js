import { describe, expect, it } from 'vitest'
import { pairCompatibility } from '../engine/pairCompatibility.js'
import { colorCompatibility } from '../engine/colorCompatibility.js'

const neutral = {
  id: 'n1',
  name: 'Neutral Tee',
  category: 'top',
  color: 'ivory',
  hex: '#F3EFE7',
  style: 'minimal',
  aesthetic: 'clean',
  pattern: 'solid',
  material: 'cotton',
  fit: 'relaxed',
  silhouette: 'straight',
  season: 'spring',
  occasion: 'casual',
  formality: 2,
}

const navy = {
  id: 'n2',
  name: 'Navy Pants',
  category: 'bottom',
  color: 'navy',
  hex: '#1D3557',
  style: 'preppy',
  aesthetic: 'classic',
  pattern: 'solid',
  material: 'cotton',
  fit: 'tailored',
  silhouette: 'structured',
  season: 'all',
  occasion: 'smart-casual',
  formality: 4,
}

describe('compatibility formula', () => {
  it('scores matching garment pairs above a neutral baseline', () => {
    expect(pairCompatibility(neutral, navy)).toBeGreaterThan(0.5)
    expect(colorCompatibility(neutral, navy)).toBeGreaterThan(0.4)
  })
})
