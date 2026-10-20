import { describe, expect, it } from 'vitest'
import { silhouetteAlignment } from '../engine/silhouette.js'

describe('silhouette alignments', () => {
  it('keeps matching silhouettes in a high compatibility band', () => {
    expect(silhouetteAlignment({ silhouette: 'straight' }, { silhouette: 'straight' })).toBeGreaterThan(0.8)
    expect(silhouetteAlignment({ silhouette: 'straight' }, { silhouette: 'flowy' })).toBeGreaterThan(0.6)
  })
})
