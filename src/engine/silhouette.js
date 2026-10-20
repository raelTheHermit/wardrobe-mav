const volumeMap = { low: 0.2, medium: 0.5, high: 0.8, regular: 0.5, uncertain: 0.5 }
const lengthMap = { cropped: 0.2, short: 0.35, regular: 0.5, long: 0.75, extra_long: 0.9, uncertain: 0.5 }

function getVolume(item) {
  const value = item?.fit_and_proportions?.relative_volume || item?.volume || item?.fit
  return volumeMap[value] ?? 0.5
}

function getLength(item) {
  const value = item?.fit_and_proportions?.relative_length || item?.length || 'regular'
  return lengthMap[value] ?? 0.5
}

export function silhouetteAlignment(a, b) {
  if (!a || !b) return 0.5

  const volumeDiff = Math.abs(getVolume(a) - getVolume(b))
  const lengthDiff = Math.abs(getLength(a) - getLength(b))
  const volumeScore = 1 - volumeDiff
  const lengthScore = 1 - lengthDiff

  return Number(Math.min(Math.max((volumeScore + lengthScore) / 2, 0), 1).toFixed(3))
}

export function silhouettePreferenceScore(outfit, preferences = {}) {
  if (!Array.isArray(outfit) || !outfit.length) return 0.5

  const targetVolumeDifference = preferences.targetVolumeDifference ?? 0.1
  const targetLengthDifference = preferences.targetLengthDifference ?? 0.1

  const scores = outfit.map((item) => {
    const top = item.category?.family === 'top' || item.category === 'top'
    const bottom = item.category?.family === 'bottom' || item.category === 'bottom'
    if (!top && !bottom) return 0.5

    const volume = getVolume(item)
    const length = getLength(item)
    const ideal = top ? 1 - Math.abs(volume - 0.45) : 1 - Math.abs(volume - 0.5)
    const lengthIdeal = 1 - Math.abs(length - (top ? 0.5 : 0.55))
    return (ideal + lengthIdeal) / 2
  })

  const base = scores.reduce((sum, value) => sum + value, 0) / scores.length
  return Number(Math.min(Math.max(base + targetVolumeDifference + targetLengthDifference - 0.2, 0), 1).toFixed(3))
}
