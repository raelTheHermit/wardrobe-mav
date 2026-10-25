import { useMemo, useState } from 'react'
import WardrobeGrid from '../components/WardrobeGrid.jsx'
import PageHeader from '../components/PageHeader.jsx'
import { wardrobeApi } from '../utils/api.js'

const COLOR_OPTIONS = [
  { value: 'ivory', label: 'Ivory', hex: '#f4f1e8' },
  { value: 'white', label: 'White', hex: '#ffffff' },
  { value: 'black', label: 'Black', hex: '#17161d' },
  { value: 'grey', label: 'Grey', hex: '#8b8e94' },
  { value: 'navy', label: 'Navy', hex: '#1f2f4a' },
  { value: 'blue', label: 'Blue', hex: '#4a7fc1' },
  { value: 'beige', label: 'Beige', hex: '#cdb99a' },
  { value: 'brown', label: 'Brown', hex: '#6b4a32' },
  { value: 'olive', label: 'Olive', hex: '#6b7340' },
  { value: 'green', label: 'Green', hex: '#2f6b4f' },
  { value: 'burgundy', label: 'Burgundy', hex: '#7a2236' },
  { value: 'yellow', label: 'Yellow', hex: '#e8c547' },
  { value: 'red', label: 'Red', hex: '#c93b3b' },
  { value: 'pink', label: 'Pink', hex: '#d99ab2' },
  { value: 'purple', label: 'Purple', hex: '#7c5ac5' },
]

const SIZE_OPTIONS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Custom']
const STYLE_OPTIONS = ['minimal', 'classic', 'street', 'boho', 'romantic', 'creative', 'edgy', 'preppy', 'athleisure', 'modern']
const TYPE_OPTIONS = {
  top: ['tee', 'shirt', 'knit', 'sweater', 'blouse', 'polo', 'tank', 'dress'],
  bottom: ['jeans', 'trouser', 'skirt', 'short', 'legging', 'chino'],
  outerwear: ['blazer', 'jacket', 'coat', 'cardigan', 'vest', 'parka'],
  accessory: ['bag', 'belt', 'scarf', 'hat', 'jewellery', 'sunglasses'],
  shoe: ['sneaker', 'loafer', 'heel', 'boot', 'sandals'],
}
const SUBTYPE_OPTIONS = {
  top: ['basic', 'button-up', 'oversized', 'fitted', 'linen', 'striped', 'graphic', 'cotton'],
  bottom: ['straight', 'wide-leg', 'slim', 'cargo', 'flare', 'linen', 'denim'],
  outerwear: ['structured', 'relaxed', 'cropped', 'oversized', 'tailored', 'layering'],
  accessory: ['leather', 'canvas', 'wool', 'metal', 'structured', 'minimal'],
  shoe: ['low-profile', 'chunky', 'sleek', 'ankle-height', 'workwear', 'dress'],
}

const blankDraft = {
  id: '',
  name: '',
  category: 'top',
  type: 'tee',
  subtype: 'basic',
  brand: '',
  size: 'M',
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
  return {
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
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label}
      {children}
    </label>
  )
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

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setImageFile(null)
    setDraft(blankDraft)
  }

  const openNew = () => {
    setDraft(blankDraft)
    setEditingId(null)
    setImageFile(null)
    setMode('quick')
    setIsFormOpen(true)
  }

  const handleSubmit = async () => {
    const garment = buildGarmentFromDraft(draft)
    const file = imageFile
    const targetId = editingId
    closeForm()

    if (targetId) {
      await onUpdateGarment?.({ ...garment, id: targetId })
      if (file) onImageUpdate?.(await wardrobeApi.upload(targetId, file))
    } else {
      const saved = await onAddGarment?.(garment)
      if (file && saved) onImageUpdate?.(await wardrobeApi.upload(saved.id, file))
    }
  }

  const handleDraftChange = (field, value) => setDraft((current) => ({ ...current, [field]: value }))
  const text = (field) => ({ className: 'input', value: draft[field] ?? '', onChange: (e) => handleDraftChange(field, e.target.value) })
  const score = (field) => ({
    className: 'input',
    type: 'number', min: '0', max: '1', step: '0.1',
    value: draft.attributes?.[field] ?? 0.5,
    onChange: (e) => handleDraftChange('attributes', { ...draft.attributes, [field]: Number(e.target.value) || 0.5 }),
  })

  const activeColor = COLOR_OPTIONS.find((option) => option.value === draft.color) || COLOR_OPTIONS[0]
  const typeChoices = TYPE_OPTIONS[draft.category] || TYPE_OPTIONS.top
  const subtypeChoices = SUBTYPE_OPTIONS[draft.category] || SUBTYPE_OPTIONS.top

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Closet" title="Wardrobe overview">
        <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={onExportWardrobe}>Export</button>
        <label className="btn-secondary flex-1 sm:flex-none">
          Import
          <input type="file" accept="application/json" className="sr-only" onChange={onImportWardrobe} />
        </label>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={openNew}>+ Add clothing</button>
      </PageHeader>

      <div className="grid gap-2 rounded-2xl border border-[#e8e2dc] bg-white p-3 shadow-[0_8px_28px_rgba(42,31,35,0.04)] sm:grid-cols-[1fr_160px_160px] sm:p-4">
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search garments" />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select className="input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="outerwear">Outerwear</option>
          <option value="accessory">Accessory</option>
          <option value="shoe">Shoe</option>
        </select>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#211a20]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={closeForm}>
          <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[26px] bg-[#fffdfa] p-4 shadow-2xl sm:rounded-[26px] sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-accent">{editingId ? 'Edit clothing' : 'Add clothing'}</p>
                <h2 className="text-2xl font-bold tracking-tight">{mode === 'quick' ? 'Quick add' : 'Detailed add'}</h2>
              </div>
              <div className="flex gap-2">
                <button type="button" className={mode === 'quick' ? 'pill active' : 'pill'} onClick={() => setMode('quick')}>Quick</button>
                <button type="button" className={mode === 'detailed' ? 'pill active' : 'pill'} onClick={() => setMode('detailed')}>Detailed</button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Garment image" className="sm:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent hover:file:bg-violet-200"
                />
              </Field>

              <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="h-7 w-7 shrink-0 rounded-full border border-slate-200" style={{ background: activeColor.hex }} />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">Quick summary</p>
                  <p className="text-sm font-semibold text-slate-800">{draft.name || 'Untitled garment'} · {activeColor.label}</p>
                </div>
              </div>

              <Field label="Garment name" className="sm:col-span-2"><input {...text('name')} /></Field>
              <Field label="Category">
                <select className="input" value={draft.category} onChange={(e) => {
                  const nextCategory = e.target.value
                  const nextType = TYPE_OPTIONS[nextCategory]?.[0] || 'tee'
                  const nextSubtype = SUBTYPE_OPTIONS[nextCategory]?.[0] || 'basic'
                  handleDraftChange('category', nextCategory)
                  handleDraftChange('type', nextType)
                  handleDraftChange('subtype', nextSubtype)
                }}>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="outerwear">Outerwear</option>
                  <option value="accessory">Accessory</option>
                  <option value="shoe">Shoe</option>
                </select>
              </Field>
              <Field label="Type">
                <select className="input" value={draft.type} onChange={(e) => handleDraftChange('type', e.target.value)}>
                  {typeChoices.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Subtype">
                <select className="input" value={draft.subtype} onChange={(e) => handleDraftChange('subtype', e.target.value)}>
                  {subtypeChoices.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Brand"><input {...text('brand')} /></Field>
              <Field label="Size">
                <select className="input" value={draft.size || 'M'} onChange={(e) => handleDraftChange('size', e.target.value)}>
                  {SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Size system">
                <select className="input" value={draft.sizeSystem} onChange={(e) => handleDraftChange('sizeSystem', e.target.value)}>
                  <option value="us">US</option>
                  <option value="uk">UK</option>
                  <option value="eu">EU</option>
                  <option value="fr">FR</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
              <Field label="Availability">
                <select className="input" value={draft.status} onChange={(e) => handleDraftChange('status', e.target.value)}>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </Field>
              <Field label="Primary color">
                <select className="input" value={draft.color} onChange={(e) => {
                  const nextColor = e.target.value
                  handleDraftChange('color', nextColor)
                  handleDraftChange('visual_attributes', {
                    ...draft.visual_attributes,
                    primary_colors: [nextColor],
                  })
                }}>
                  {COLOR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fit">
                <select className="input" value={draft.fit} onChange={(e) => handleDraftChange('fit', e.target.value)}>
                  <option value="fitted">Fitted</option>
                  <option value="regular">Regular</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="oversized">Oversized</option>
                </select>
              </Field>
              <Field label="Style">
                <select className="input" value={draft.style} onChange={(e) => handleDraftChange('style', e.target.value)}>
                  {STYLE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Aesthetic"><input {...text('aesthetic')} /></Field>
              {mode === 'detailed' ? (
                <>
                  <Field label="Pattern"><input {...text('pattern')} /></Field>
                  <Field label="Material"><input {...text('material')} /></Field>
                  <Field label="Formality (0 to 1)"><input {...score('formality_estimate')} /></Field>
                  <Field label="Visual weight (0 to 1)"><input {...score('visual_weight_estimate')} /></Field>
                </>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleSubmit}>Save garment</button>
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
