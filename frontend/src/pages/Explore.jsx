import OutfitCard from '../components/OutfitCard.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function Explore({ outfits, onSaveOutfit }) {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Explore" title="Mix and match ideas" />
      {outfits.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {outfits.map((item) => (
            <OutfitCard
              key={item.id}
              outfit={item.outfit}
              score={item.score}
              breakdown={item.breakdown}
              onSave={() => onSaveOutfit(item)}
            />
          ))}
        </div>
      ) : (
        <p className="card text-slate-600">No outfit ideas yet. Add a few garments to your wardrobe first.</p>
      )}
    </section>
  )
}