import GarmentCard from './GarmentCard.jsx'

export default function WardrobeGrid({ garments, onSelect, onEdit, onToggleAvailability, onDelete }) {
  if (!garments.length) {
    return (
      <div className="card py-12 text-center">
        <p className="font-semibold">No garments match these filters</p>
        <p className="mt-1 text-sm text-slate-500">Clear the search or add something to your closet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
