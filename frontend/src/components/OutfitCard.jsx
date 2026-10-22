import { buildExplanation } from '../utils/explanation.js'
import { getCategoryFamily } from '../utils/garmentHelpers.js'

export default function OutfitCard({ outfit, score, breakdown, onSave }) {
  const swatches = outfit.map((item) => item.hex || item.visual_attributes?.primary_colors?.[0] || item.color || '#dfeaf6')

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="grid grid-cols-4 gap-2.5">
        {outfit.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-2" title={item.name}>
            <div className="aspect-square rounded-xl border border-white/60" style={{ background: swatches[index] }} />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">{getCategoryFamily(item.category)}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-semibold text-slate-900">{outfit.map((item) => item.name).join(' + ')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{buildExplanation(outfit, breakdown)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right leading-none">
            <div className="text-3xl font-bold tracking-tight text-slate-900">{Math.round(score * 100)}%</div>
            <small className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">match</small>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Save
          </button>
        </div>
      </div>
    </article>
  )
}
