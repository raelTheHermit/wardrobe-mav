import { useMemo } from 'react'
import OutfitCard from '../components/OutfitCard.jsx'
import OutfitDetails from '../components/OutfitDetails.jsx'
import PageHeader from '../components/PageHeader.jsx'

const contextOptions = ['casual', 'formal', 'warm', 'cold', 'rainy']
const aestheticOptions = ['minimal', 'classic', 'street']

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
}) {
  const primary = useMemo(() => outfits[0], [outfits])
  const formalityLabel = ['Relaxed', 'Easygoing', 'Balanced', 'Polished', 'Dressy'][Math.max(0, Math.min(4, Number(formalityBias) - 1))]

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-violet-200 bg-white/85 p-4 shadow-[0_20px_45px_rgba(91,33,182,0.08)] backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">Fitzii</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dress with more ease</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="font-medium text-slate-500">Saved picks</span>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">{savedCount}</span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <span className="min-w-[84px] text-sm font-semibold text-slate-500">Context</span>
            <div className="flex flex-wrap gap-2">
              {contextOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={currentContext === option}
                  onClick={() => onContextChange?.(option)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition ${currentContext === option ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <span className="min-w-[84px] text-sm font-semibold text-slate-500">Aesthetic</span>
            <div className="flex flex-wrap gap-2">
              {aestheticOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={currentAesthetic === option}
                  onClick={() => onAestheticChange?.(option)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition ${currentAesthetic === option ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3 md:max-w-md">
              <span className="min-w-[84px] text-sm font-semibold text-slate-500">Formality</span>
              <input
                type="range"
                min="1"
                max="5"
                value={Number(formalityBias) || 3}
                onChange={(event) => onFormalityChange?.(Number(event.target.value))}
                className="h-2 w-full accent-violet-600"
                aria-label="Formality bias"
              />
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{formalityLabel}</span>
          </div>
        </div>
      </div>

      <PageHeader eyebrow="Today" title="Best for today">
        <span className="tag">{currentContext}</span>
      </PageHeader>

      {primary ? (
        <div className="space-y-5">
          <OutfitCard
            featured
            outfit={primary.outfit}
            score={primary.score}
            breakdown={primary.breakdown}
            onSave={() => onSaveOutfit(primary)}
          />
          <OutfitDetails outfit={primary.outfit} score={primary.score} breakdown={primary.breakdown} />
        </div>
      ) : (
        <p className="card text-slate-600">No outfits matched the selected context yet.</p>
      )}

      {outfits.length > 1 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {outfits.slice(1, 4).map((item) => (
            <OutfitCard
              key={item.id}
              outfit={item.outfit}
              score={item.score}
              breakdown={item.breakdown}
              onSave={() => onSaveOutfit(item)}
            />
          ))}
        </div>
      ) : null}

      <section className="space-y-5">
        <h3 className="text-xl font-bold tracking-tight">In your favorite aesthetic</h3>
        {aestheticOutfits[0] ? (
          <>
            <OutfitCard
              featured
              outfit={aestheticOutfits[0].outfit}
              score={aestheticOutfits[0].score}
              breakdown={aestheticOutfits[0].breakdown}
              onSave={() => onSaveOutfit(aestheticOutfits[0])}
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {aestheticOutfits.slice(1, 4).map((item) => (
                <OutfitCard
                  key={item.id}
                  outfit={item.outfit}
                  score={item.score}
                  breakdown={item.breakdown}
                  onSave={() => onSaveOutfit(item)}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="card text-slate-600">No outfits matched this aesthetic yet. Pick one under Preferences.</p>
        )}
      </section>
    </section>
  )
}