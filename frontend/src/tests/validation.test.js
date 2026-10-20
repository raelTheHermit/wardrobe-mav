import { describe, expect, it } from 'vitest'
import { validateGarment, validateOutfit } from '../engine/validation.js'

const validGarment = {
  id: 'a1',
  name: 'Test Tee',
  category: 'top',
  color: 'ivory',
  style: 'minimal',
  aesthetic: 'clean',
  season: 'spring',
  occasion: 'casual',
}

describe('validation engine', () => {
  it('accepts valid garments', () => {
    expect(validateGarment(validGarment)).toBe(true)
  })

  it('rejects incomplete garments', () => {
    expect(validateGarment({ id: 'a1', category: 'top' })).toBe(false)
  })

  it('accepts outfit with top and bottom', () => {
    expect(validateOutfit([validGarment, { ...validGarment, id: 'b1', category: 'bottom', name: 'Test Pants' }])).toBe(true)
  })
})
