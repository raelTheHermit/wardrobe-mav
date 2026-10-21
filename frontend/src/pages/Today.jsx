import { useMemo } from 'react'
import OutfitCard from '../components/OutfitCard.jsx'
import OutfitDetails from '../components/OutfitDetails.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function Today({ outfits, aestheticOutfits = [], currentContext, onSaveOutfit }) {
  const primary = useMemo(() => outfits[0], [outfits])

  return (
    <section className="space-y-8">
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