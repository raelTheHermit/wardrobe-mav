export default function OutfitDetails({ outfit, score, breakdown }) {
  return (
    <div className="outfit-details">
      <h4>Scoring breakdown</h4>
      <ul>
        <li>Harmony: {Math.round((breakdown.compatibility || 0) * 100)}%</li>
        <li>Style match: {Math.round((breakdown.style || 0) * 100)}%</li>
        <li>Context fit: {Math.round((breakdown.context || 0) * 100)}%</li>
        <li>Personal fit: {Math.round((breakdown.preference || 0) * 100)}%</li>
        <li>Novelty: {Math.round((breakdown.novelty || 0) * 100)}%</li>
      </ul>
      <strong>Overall: {Math.round(score * 100)}%</strong>
    </div>
  )
}
