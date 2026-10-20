import GarmentCard from './GarmentCard.jsx'

export default function WardrobeGrid({ garments, onSelect, onEdit, onToggleAvailability, onDelete }) {
  return (
    <div className="wardrobe-grid">
      {garments.map((garment) => (
        <GarmentCard
          key={garment.id}
          garment={garment}
          onSelect={onSelect}
          onEdit={onEdit}
          onToggleAvailability={onToggleAvailability}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
