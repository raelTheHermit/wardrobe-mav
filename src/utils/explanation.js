export function buildExplanation(outfit, breakdown = {}) {
  const top = outfit[0]?.name || 'top'
  const bottom = outfit[1]?.name || 'bottom'
  const shoes = outfit[2]?.name || 'shoes'

  return `${top} with ${bottom} and ${shoes} balances ${Number((breakdown.compatibility || 0) * 100).toFixed(0)}% harmony with a ${Number((breakdown.style || 0) * 100).toFixed(0)}% style match.`
}
