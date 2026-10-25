import OutfitCard from '../components/OutfitCard.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function Explore({ outfits, onSaveOutfit }) {
  return (
    <section className="space-y-5 sm:space-y-6">
      <PageHeader eyebrow="Explore" title="Outfit ideas" />
      <p className="-mt-3 max-w-2xl text-sm leading-6 text-slate-600">Browse more combinations from your wardrobe. Save the looks you want to wear again.</p>
      {outfits.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {outfits.map((item) => (
            <OutfitCard
              key={item.id}
              outfit={item.outfit}
              score={item.score}
              breakdown={item.breakdown}
              templates={item.templates}
              onSave={() => onSaveOutfit(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#d9cec5] bg-white px-5 py-10 text-center">
          <h3 className="font-semibold text-ink">Your next outfit starts in your closet</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Add a top, bottom, and shoes to see combinations here.</p>
        </div>
      )}
    </section>
  )
}
