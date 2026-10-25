export default function OutfitDetails({ outfit, breakdown }) {
  const labels = {
    compatibility: 'Piece harmony',
    context: 'Occasion fit',
    aesthetic: 'Aesthetic match',
    personal: 'Your preferences',
    silhouette: 'Proportions',
    fit: 'Size and fit',
    template: 'Vibe match',
    novelty: 'Freshness',
  }
  const factors = Object.entries(breakdown || {}).filter(([key, value]) => labels[key] && value != null)

  return (
    <details className="group rounded-2xl border border-[#e8e2dc] bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>Why this look works</span>
        <span className="text-lg text-accent transition-transform duration-150 group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="space-y-3 border-t border-[#f0ece7] px-4 py-4">
        {factors.map(([key, value]) => (
          <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="font-medium text-slate-600">{labels[key]}</span>
            <span className="font-semibold tabular-nums text-ink">{Math.round(value * 100)}%</span>
            <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[#f0ece7]" role="progressbar" aria-label={labels[key]} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(value * 100)}>
              <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
            </span>
          </div>
        ))}
        <p className="border-t border-[#f0ece7] pt-3 text-xs leading-5 text-slate-500">Based on {outfit.length} pieces and the details you’ve added to your closet.</p>
      </div>
    </details>
  )
}
