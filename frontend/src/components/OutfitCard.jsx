import { buildExplanation } from '../engine/explanation.js'
import { getCategoryFamily } from '../utils/garmentHelpers.js'
import { getTemplate } from '../data/outfitTemplates.js'
import { mediaUrl } from '../utils/api.js'
import { useResolvedImageSource } from '../utils/imageCache.js'

function OutfitTile({ item, swatch }) {
  const imageSrc = useResolvedImageSource(item.image_path ? mediaUrl(item.image_path) : null)

  return (
    <div className="relative aspect-[1.15/1] overflow-hidden rounded-[17px] bg-white" title={item.name}>
      {item.image_path ? <img src={imageSrc} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${swatch}, color-mix(in srgb, ${swatch} 75%, #352631))` }} />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-2 pt-5 text-[9px] font-semibold uppercase tracking-[0.13em] text-white">{getCategoryFamily(item.category)}</span>
    </div>
  )
}

export default function OutfitCard({ outfit, score, breakdown, onSave, templates = [], featured = false }) {
  const swatches = outfit.map((item) => item.hex || item.visual_attributes?.primary_colors?.[0] || item.color || '#dfeaf6')

  return (
    <article className={`overflow-hidden rounded-[24px] border border-[#e8e2dc] bg-white shadow-[0_10px_30px_rgba(42,31,35,0.055)] ${featured ? 'ring-1 ring-white' : ''}`}>
      <div className="grid grid-cols-3 gap-1.5 bg-[#f3efeb] p-1.5">
        {outfit.map((item, index) => (
          <OutfitTile key={item.id} item={item} swatch={swatches[index]} />
        ))}
      </div>

      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-ink">{outfit.map((item) => item.name).join(' + ')}</h3>
          {templates.length ? <div className="mt-2 flex flex-wrap gap-1">{templates.map((id) => getTemplate(id)?.label).filter(Boolean).map((label) => <span key={label} className="rounded-full bg-[#f3e9ec] px-2.5 py-1 text-[10px] font-semibold text-accent">{label}</span>)}</div> : null}
          <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">{buildExplanation(outfit, breakdown)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <div className="rounded-xl bg-[#f7f4f0] px-2.5 py-1.5 text-right leading-none">
            <div className="text-xl font-semibold tracking-tight text-ink">{Math.round(score * 100)}%</div>
            <small className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-400">match</small>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#e8e2dc] bg-white text-accent transition hover:bg-[#f7f0f2] focus-visible:outline-2 focus-visible:outline-accent"
            aria-label="Save outfit"
            title="Save outfit"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M6 4.8c0-1 .8-1.8 1.8-1.8h8.4c1 0 1.8.8 1.8 1.8V21l-6-4-6 4V4.8Z" /></svg>
          </button>
        </div>
      </div>
    </article>
  )
}
