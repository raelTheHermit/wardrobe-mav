import { useMemo } from 'react'
import OutfitCard from '../components/OutfitCard.jsx'
import OutfitDetails from '../components/OutfitDetails.jsx'
import { aestheticOptions } from '../data/aesthetics.js'

const contextOptions = [
  ['casual', 'Everyday'],
  ['formal', 'Dressy'],
  ['warm', 'Warm day'],
  ['cold', 'Cold day'],
  ['rainy', 'Rainy'],
]
export default function Today({
  outfits,
  aestheticOutfits = [],
  currentContext,
  currentAesthetic,
  formalityBias = 3,
  onContextChange,
  onAestheticChange,
  onFormalityChange,
  onSaveOutfit,
  savedCount,
  templates = [],
  currentTemplate = null,
  onTemplateChange,
}) {
  const primary = useMemo(() => outfits[0], [outfits])
  const formalityLabel = ['Relaxed', 'Easygoing', 'Balanced', 'Polished', 'Dressy'][Math.max(0, Math.min(4, Number(formalityBias) - 1))]

  return (
    <section className="space-y-7 sm:space-y-9">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">For the day ahead</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-ink sm:text-3xl">What are we wearing?</h2>
          </div>
          <span className="mb-1 shrink-0 rounded-full border border-[#e8e2dc] bg-white px-3 py-1.5 text-xs font-medium text-slate-600">{savedCount} saved</span>
        </div>
        <p className="text-sm text-slate-500">A few good ideas, made from your own closet.</p>
      </div>

      <div className="rounded-[24px] border border-[#e8e2dc] bg-white p-4 shadow-[0_8px_28px_rgba(42,31,35,0.04)] sm:p-5">
        <div>
          <p className="text-sm font-semibold text-ink">What’s the plan?</p>
          <p className="mt-0.5 text-xs text-slate-500">We’ll dress for the moment.</p>
        </div>
        <div className="hide-scrollbar -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {contextOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={currentContext === value} onClick={() => onContextChange?.(value)} className={`min-h-11 shrink-0 snap-start rounded-full border px-4 text-sm font-medium transition ${currentContext === value ? 'border-accent bg-accent text-white shadow-sm' : 'border-[#e8e2dc] bg-[#fbfaf8] text-slate-700 hover:border-accent/40'}`}>{label}</button>)}
        </div>

        <div className="mt-5 border-t border-[#f0ece7] pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-ink">Pick a feeling</p>
              <p className="mt-0.5 text-xs text-slate-500">Give today’s look a little direction.</p>
            </div>
            {currentTemplate ? <button type="button" onClick={() => onTemplateChange?.(null)} className="min-h-10 px-2 text-xs font-semibold text-accent">Clear</button> : null}
          </div>
          <div className="hide-scrollbar -mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <button type="button" aria-pressed={!currentTemplate} onClick={() => onTemplateChange?.(null)} className={`min-h-11 shrink-0 snap-start rounded-xl border px-4 text-sm font-medium transition ${!currentTemplate ? 'border-[#d9c1c9] bg-[#f7f0f2] text-accent' : 'border-[#e8e2dc] bg-white text-slate-600'}`}>Surprise me</button>
            {templates.map((item) => <button key={item.id} type="button" aria-pressed={currentTemplate === item.id} title={item.mood} onClick={() => onTemplateChange?.(item.id)} className={`min-h-11 shrink-0 snap-start rounded-xl border px-4 text-sm font-medium transition ${currentTemplate === item.id ? 'border-[#d9c1c9] bg-[#f7f0f2] text-accent' : 'border-[#e8e2dc] bg-white text-slate-600'}`}>{item.label}</button>)}
          </div>
        </div>

        <details className="group mt-4 border-t border-[#f0ece7] pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
            Fine-tune your picks
            <span className="text-lg text-accent transition group-open:rotate-45">+</span>
          </summary>
          <div className="space-y-4 pt-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Aesthetic</p>
              <div className="flex flex-wrap gap-2">
                {aestheticOptions.map((option) => <button key={option.id} type="button" aria-pressed={currentAesthetic === option.id} onClick={() => onAestheticChange?.(option.id)} title={option.description} className={`min-h-10 rounded-full border px-4 text-sm ${currentAesthetic === option.id ? 'border-accent bg-accent text-white' : 'border-[#e8e2dc] bg-white text-slate-700'}`}>{option.label}</button>)}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Dressiness</span><span className="normal-case tracking-normal text-accent">{formalityLabel}</span></span>
              <input type="range" min="1" max="5" value={Number(formalityBias) || 3} onChange={(event) => onFormalityChange?.(Number(event.target.value))} className="h-2 w-full accent-accent" aria-label="Dressiness" />
            </label>
          </div>
        </details>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-accent">Your strongest match</p><h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">Today’s outfit</h3></div>
          <span className="mb-1 rounded-full bg-[#eee7e3] px-3 py-1 text-xs font-semibold capitalize text-slate-600">{currentContext}</span>
        </div>
        {primary ? <>
          <OutfitCard featured outfit={primary.outfit} score={primary.score} breakdown={primary.breakdown} templates={primary.templates} onSave={() => onSaveOutfit(primary)} />
          <OutfitDetails outfit={primary.outfit} breakdown={primary.breakdown} />
        </> : <div className="rounded-[24px] border border-dashed border-[#d9cec5] bg-white px-5 py-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f3e9ec] text-xl text-accent">✦</span>
          <h3 className="mt-3 font-semibold text-ink">A look is waiting in your closet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Add a top, a bottom, and shoes—or try another occasion or vibe.</p>
        </div>}
      </section>

      {outfits.length > 1 ? <section className="space-y-3">
        <div className="flex items-baseline justify-between"><h3 className="text-lg font-semibold tracking-tight text-ink">A few more ideas</h3><span className="text-xs text-slate-500">Picked for you</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{outfits.slice(1, 4).map((item) => <OutfitCard key={item.id} outfit={item.outfit} score={item.score} breakdown={item.breakdown} templates={item.templates} onSave={() => onSaveOutfit(item)} />)}</div>
      </section> : null}

      <section className="space-y-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.17em] text-accent">More like your style</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">In your {currentAesthetic} aesthetic</h3></div>
        {aestheticOutfits.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{aestheticOutfits.slice(0, 3).map((item) => <OutfitCard key={item.id} outfit={item.outfit} score={item.score} breakdown={item.breakdown} templates={item.templates} onSave={() => onSaveOutfit(item)} />)}</div> : <p className="rounded-2xl border border-[#e8e2dc] bg-white p-4 text-sm text-slate-500">Add more tagged pieces to get suggestions in this aesthetic.</p>}
      </section>
    </section>
  )
}
