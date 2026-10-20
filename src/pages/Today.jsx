import { useMemo } from 'react'
import OutfitCard from '../components/OutfitCard.jsx'
import OutfitDetails from '../components/OutfitDetails.jsx'

export default function Today({ outfits, aestheticOutfits = [], currentContext, onSaveOutfit }) {
  const primary = useMemo(() => outfits[0], [outfits])

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Best for today</h2>
        </div>
        <span className="tag">{currentContext}</span>
      </div>

      {primary ? (
        <>
          <OutfitCard outfit={primary.outfit} score={primary.score} breakdown={primary.breakdown} onSave={() => onSaveOutfit(primary)} />
          <OutfitDetails outfit={primary.outfit} score={primary.score} breakdown={primary.breakdown} />
        </>
      ) : (
        <p>No outfits matched the selected context yet.</p>
      )}

      <div className="mini-grid">
        {outfits.slice(1, 4).map((item) => (
          <OutfitCard key={item.id} outfit={item.outfit} score={item.score} breakdown={item.breakdown} onSave={() => onSaveOutfit(item)} />
        ))}
      </div>
      <section className="recommendation-mode">
        <h2>In your favorite aesthetic</h2>
        {aestheticOutfits[0] ? (
          <>
            <OutfitCard outfit={aestheticOutfits[0].outfit} score={aestheticOutfits[0].score} breakdown={aestheticOutfits[0].breakdown} onSave={() => onSaveOutfit(aestheticOutfits[0])} />
            <div className="mini-grid">
              {aestheticOutfits.slice(1, 4).map((item) => <OutfitCard key={item.id} outfit={item.outfit} score={item.score} breakdown={item.breakdown} onSave={() => onSaveOutfit(item)} />)}
            </div>
          </>
        ) : <p>No outfits matched this aesthetic yet.</p>}
      </section>
    </section>
  )
}
