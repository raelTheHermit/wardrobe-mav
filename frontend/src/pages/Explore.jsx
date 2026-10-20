import OutfitCard from '../components/OutfitCard.jsx'

export default function Explore({ outfits, onSaveOutfit }) {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>Mix and match ideas</h2>
        </div>
      </div>
      <div className="mini-grid">
        {outfits.map((item) => (
          <OutfitCard key={item.id} outfit={item.outfit} score={item.score} breakdown={item.breakdown} onSave={() => onSaveOutfit(item)} />
        ))}
      </div>
    </section>
  )
}
