import { describe, expect, it } from 'vitest'
import { buildFitCompatibility, convertMeasurementValue, createDefaultProfile } from '../utils/bodyProfile.js'
import { loadProfile, saveProfile } from '../utils/wardrobeStorage.js'

describe('body profile utilities', () => {
  it('converts centimetres to inches correctly', () => {
    expect(convertMeasurementValue(10, 'cm', 'in')).toBeCloseTo(3.937, 3)
  })

  it('saves and loads a partial profile without inferencing measurements', () => {
    const profile = createDefaultProfile({ height: 170, heightUnit: 'cm', fitNotes: 'Tall torso' })
    const saved = saveProfile(profile)
    const loaded = loadProfile()
    expect(saved.height).toBe(170)
    expect(loaded.height).toBe(170)
    expect(loaded.measurements).toEqual([])
    expect(loaded.fitNotes).toBe('Tall torso')
  })

  it('does not penalize missing measurements when scoring fit', () => {
    const profile = createDefaultProfile({ fitPreferences: { tops: 'regular', bottoms: 'straight' } })
    const outfit = [
      { id: 't1', category: 'top', fit_and_proportions: { apparent_fit: 'regular', relative_length: 'regular', relative_volume: 'medium' }, name: 'Tee' },
      { id: 'b1', category: 'bottom', fit_and_proportions: { apparent_fit: 'straight', relative_length: 'regular', relative_volume: 'medium' }, name: 'Pants' },
    ]

    const score = buildFitCompatibility(outfit, profile)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})
