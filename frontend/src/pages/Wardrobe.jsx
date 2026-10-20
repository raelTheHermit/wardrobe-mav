import { useMemo, useState } from 'react'
import WardrobeGrid from '../components/WardrobeGrid.jsx'
import { wardrobeApi } from '../utils/api.js'

const blankDraft = {
  id: '',
  name: '',
  category: 'top',
  type: 'tee',
  subtype: '',
  brand: '',
  size: '',
  sizeSystem: 'us',
  status: 'available',
  color: 'ivory',
  fit: 'regular',
  style: 'minimal',
  aesthetic: 'clean',
  pattern: 'solid',
  material: 'cotton',
  visual_attributes: { primary_colors: ['ivory'], secondary_colors: [], pattern: 'solid', texture: 'smooth' },
  attributes: { formality_estimate: 0.5, visual_weight_estimate: 0.5, seasonal_suitability: [], functional_tags: [] },
  fit_and_proportions: { apparent_fit: 'regular', silhouette: 'straight', relative_volume: 'medium', relative_length: 'regular' },
}

function buildGarmentFromDraft(draft) {
  const garment = {
    id: draft.id || `g-${Date.now()}`,
    name: draft.name || 'Untitled garment',
    category: draft.category || 'top',
    type: draft.type || 'tee',
    subtype: draft.subtype || '',
    brand: draft.brand || '',
    size: draft.size || '',
    sizeSystem: draft.sizeSystem || 'us',
    status: draft.status || 'available',
    color: draft.color || 'unknown',
    hex: draft.hex || '#d9d9d9',
    style: draft.style || 'minimal',
    aesthetic: draft.aesthetic || 'clean',
    pattern: draft.pattern || 'solid',
    material: draft.material || 'unknown',
    fit: draft.fit || 'regular',
    silhouette: draft.fit_and_proportions?.silhouette || 'straight',
    season: draft.season || 'all',
    visual_attributes: {
      primary_colors: draft.visual_attributes?.primary_colors || [draft.color || 'unknown'],
      secondary_colors: draft.visual_attributes?.secondary_colors || [],
      pattern: draft.visual_attributes?.pattern || 'solid',
      texture: draft.visual_attributes?.texture || 'smooth',
      visible_details: draft.visible_details || '',
    },
    attributes: {
      formality_estimate: Number(draft.attributes?.formality_estimate ?? 0.5),
      visual_weight_estimate: Number(draft.attributes?.visual_weight_estimate ?? 0.5),
      seasonal_suitability: draft.attributes?.seasonal_suitability || [],
      functional_tags: draft.attributes?.functional_tags || [],
    },
    fit_and_proportions: {
      apparent_fit: draft.fit_and_proportions?.apparent_fit || draft.fit || 'regular',
      silhouette: draft.fit_and_proportions?.silhouette || 'straight',
      relative_volume: draft.fit_and_proportions?.relative_volume || 'medium',
      relative_length: draft.fit_and_proportions?.relative_length || 'regular',
      optional_measurements: draft.fit_and_proportions?.optional_measurements || {},
    },
  }

  return garment
}

export default function Wardrobe({ garments, onSelectGarment, onAddGarment, onUpdateGarment, onImageUpdate, onDeleteGarment, onToggleGarmentAvailability, onExportWardrobe, onImportWardrobe }) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [mode, setMode] = useState('quick')
  const [draft, setDraft] = useState(blankDraft)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [imageFile, setImageFile] = useState(null)

  const visibleGarments = useMemo(() => {
    return garments.filter((garment) => {
      const matchesSearch = !search || garment.name?.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || garment.status === statusFilter
      const matchesCategory = categoryFilter === 'all' || garment.category === categoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [categoryFilter, garments, search, statusFilter])

  const handleSubmit = () => {
    const garment = buildGarmentFromDraft(draft)
    if (editingId) onUpdateGarment?.({ ...garment, id: editingId }).then(async () => {
      if (imageFile) onImageUpdate?.(await wardrobeApi.upload(editingId, imageFile))
    })
    else onAddGarment?.(garment).then(async (saved) => {
      if (imageFile && saved) onImageUpdate?.(await wardrobeApi.upload(saved.id, imageFile))
    })
    setDraft(blankDraft)
    setEditingId(null)
    setImageFile(null)
    setIsFormOpen(false)
  }

  const handleDraftChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Closet</p>
          <h2>Wardrobe overview</h2>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onExportWardrobe}>Export Wardrobe</button>
          <label className="secondary-button file-button">
            Import Wardrobe
            <input type="file" accept="application/json" onChange={onImportWardrobe} />
          </label>
          <button type="button" className="primary-button" onClick={() => setIsFormOpen(true)}>+ Add Clothing</button>
        </div>
      </div>

      <div className="toolbar-card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search garments" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="outerwear">Outerwear</option>
          <option value="accessory">Accessory</option>
          <option value="shoe">Shoe</option>
        </select>
      </div>

      {isFormOpen ? (
        <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <div className="page-header">
              <div>
                <p className="eyebrow">Add clothing</p>
                <h2>{mode === 'quick' ? 'Quick add' : 'Detailed add'}</h2>
              </div>
              <div className="button-row">
                <button type="button" className={mode === 'quick' ? 'pill active' : 'pill'} onClick={() => setMode('quick')}>Quick Add</button>
                <button type="button" className={mode === 'detailed' ? 'pill active' : 'pill'} onClick={() => setMode('detailed')}>Detailed Add</button>
              </div>
            </div>

            <div className="form-grid">
              <label className="file-button">Garment image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>
              <label>
                Garment name
                <input value={draft.name} onChange={(event) => handleDraftChange('name', event.target.value)} />
              </label>
              <label>
                Category
                <select value={draft.category} onChange={(event) => handleDraftChange('category', event.target.value)}>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="accessory">Accessory</option>
                  <option value="shoe">Shoe</option>
                </select>
              </label>
              <label>
                Type
                <input value={draft.type} onChange={(event) => handleDraftChange('type', event.target.value)} />
              </label>
              <label>
                Subtype
                <input value={draft.subtype} onChange={(event) => handleDraftChange('subtype', event.target.value)} />
              </label>
              <label>
                Brand
                <input value={draft.brand} onChange={(event) => handleDraftChange('brand', event.target.value)} />
              </label>
              <label>
                Size
                <input value={draft.size} onChange={(event) => handleDraftChange('size', event.target.value)} />
              </label>
              <label>
                Size system
                <select value={draft.sizeSystem} onChange={(event) => handleDraftChange('sizeSystem', event.target.value)}>
                  <option value="us">US</option>
                  <option value="uk">UK</option>
                  <option value="eu">EU</option>
                  <option value="fr">FR</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Availability
                <select value={draft.status} onChange={(event) => handleDraftChange('status', event.target.value)}>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
              <label>
                Primary color
                <input value={draft.color} onChange={(event) => handleDraftChange('color', event.target.value)} />
              </label>
              <label>
                Fit
                <select value={draft.fit} onChange={(event) => handleDraftChange('fit', event.target.value)}>
                  <option value="fitted">Fitted</option>
                  <option value="regular">Regular</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="oversized">Oversized</option>
                </select>
              </label>
              <label>
                Style
                <input value={draft.style} onChange={(event) => handleDraftChange('style', event.target.value)} />
              </label>
              <label>
                Aesthetic
                <input value={draft.aesthetic} onChange={(event) => handleDraftChange('aesthetic', event.target.value)} />
              </label>
              {mode === 'detailed' ? (
                <>
                  <label>
                    Pattern
                    <input value={draft.pattern} onChange={(event) => handleDraftChange('pattern', event.target.value)} />
                  </label>
                  <label>
                    Material
                    <input value={draft.material} onChange={(event) => handleDraftChange('material', event.target.value)} />
                  </label>
                  <label>
                    Formality estimate
                    <input type="number" min="0" max="1" step="0.1" value={draft.attributes?.formality_estimate ?? 0.5} onChange={(event) => handleDraftChange('attributes', { ...draft.attributes, formality_estimate: Number(event.target.value) || 0.5 })} />
                  </label>
                  <label>
                    Visual weight
                    <input type="number" min="0" max="1" step="0.1" value={draft.attributes?.visual_weight_estimate ?? 0.5} onChange={(event) => handleDraftChange('attributes', { ...draft.attributes, visual_weight_estimate: Number(event.target.value) || 0.5 })} />
                  </label>
                </>
              ) : null}
            </div>

            <div className="button-row right-aligned">
              <button type="button" className="secondary-button" onClick={() => { setIsFormOpen(false); setEditingId(null); setImageFile(null) }}>Cancel</button>
              <button type="button" className="primary-button" onClick={handleSubmit}>Save garment</button>
            </div>
          </div>
        </div>
      ) : null}

      <WardrobeGrid
        garments={visibleGarments}
        onSelect={onSelectGarment}
        onEdit={(garment) => {
          setEditingId(garment.id)
          setDraft({
            ...blankDraft,
            ...garment,
            visual_attributes: garment.visual_attributes || blankDraft.visual_attributes,
            attributes: garment.attributes || blankDraft.attributes,
            fit_and_proportions: garment.fit_and_proportions || blankDraft.fit_and_proportions,
          })
          setIsFormOpen(true)
          setMode('detailed')
        }}
        onToggleAvailability={onToggleGarmentAvailability}
        onDelete={onDeleteGarment}
      />
    </section>
  )
}
