import { useState } from 'react'
import { createDefaultProfile, normalizeProfile } from '../utils/bodyProfile.js'
import PageHeader from '../components/PageHeader.jsx'

function HelpPopover({ title, text }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600 transition hover:border-violet-400 hover:text-violet-700"
        aria-label={title}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        onBlur={() => setIsOpen(false)}
        title={title}
      >
        ?
      </button>
      {isOpen ? (
        <div role="dialog" aria-label={title} className="absolute left-0 top-7 z-20 w-64 rounded-xl border border-slate-200 bg-white p-2 text-left text-xs leading-snug text-slate-600 shadow-lg">
          <p className="font-semibold text-slate-800">{title}</p>
          <p className="mt-1">{text}</p>
        </div>
      ) : null}
    </div>
  )
}

const measurementLabels = {
  shoulderWidth: 'Shoulder width',
  chestCircumference: 'Chest circumference',
  waistCircumference: 'Waist circumference',
  hipCircumference: 'Hip circumference',
  inseam: 'Inseam',
  outseam: 'Outseam',
  sleeveLength: 'Sleeve length',
  armCircumference: 'Arm circumference',
  thighCircumference: 'Thigh circumference',
  neckCircumference: 'Neck circumference',
}

const measurementGuides = {
  shoulderWidth: { label: 'Shoulder width', image: '/images/measurement-guides/shoulder.svg', tip: 'Measure straight across your upper back from shoulder bone to shoulder bone.' },
  chestCircumference: { label: 'Chest circumference', image: '/images/measurement-guides/chest.svg', tip: 'Wrap the tape around the fullest part of the chest, keeping it level under your arms.' },
  waistCircumference: { label: 'Waist circumference', image: '/images/measurement-guides/waist.svg', tip: 'Measure around the natural waist, usually the narrowest part of your torso.' },
  hipCircumference: { label: 'Hip circumference', image: '/images/measurement-guides/hip.svg', tip: 'Measure around the fullest part of your hips and seat, standing naturally.' },
  inseam: { label: 'Inseam', image: '/images/measurement-guides/inseam.svg', tip: 'Measure from the crotch seam to the bottom of the ankle, keeping the leg straight.' },
  outseam: { label: 'Outseam', image: '/images/measurement-guides/inseam.svg', tip: 'Measure from the waistband to the floor or hem at the outside of the leg.' },
  sleeveLength: { label: 'Sleeve length', image: '/images/measurement-guides/sleeve.svg', tip: 'Measure from the shoulder edge down to the wrist bone with the arm relaxed.' },
  armCircumference: { label: 'Arm circumference', image: '/images/measurement-guides/sleeve.svg', tip: 'Measure around the fullest part of the upper arm, relaxed but not tucked in.' },
  thighCircumference: { label: 'Thigh circumference', image: '/images/measurement-guides/inseam.svg', tip: 'Measure around the fullest part of the upper thigh, standing with weight even.' },
  neckCircumference: { label: 'Neck circumference', image: '/images/measurement-guides/shoulder.svg', tip: 'Wrap the tape around the base of the neck, keeping it comfortable and level.' },
}

export default function MyProfile({ profile, onProfileChange, onClearProfile, onSaveProfile }) {
  const current = normalizeProfile(profile || createDefaultProfile())
  const measurements = Array.isArray(current.measurements) ? current.measurements : []
  const updateField = (field, value) => onProfileChange(normalizeProfile({ ...current, [field]: value }))

  const updateMeasurement = (index, field, value) => {
    const next = [...measurements]
    next[index] = { ...next[index], [field]: value }
    onProfileChange(normalizeProfile({ ...current, measurements: next }))
  }

  const addMeasurement = () => {
    onProfileChange(normalizeProfile({
      ...current,
      measurements: [...measurements, { name: 'chestCircumference', value: '', unit: 'cm', notes: '', confidence: 'estimated' }],
    }))
  }

  const removeMeasurement = (index) => {
    onProfileChange(normalizeProfile({ ...current, measurements: measurements.filter((_, i) => i !== index) }))
  }

  const getGuide = (name) => measurementGuides[name] || measurementGuides.chestCircumference

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="My profile" title="Body profile">
        <button type="button" className="btn-secondary" onClick={onClearProfile}>Clear profile</button>
        <button type="button" className="btn-primary" onClick={onSaveProfile}>Save profile</button>
      </PageHeader>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="settings-card space-y-4">
          <h3 className="text-lg font-semibold">Basic body information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              Height
              <input className="input" type="number" value={current.height ?? ''} onChange={(e) => updateField('height', Number(e.target.value) || null)} placeholder="170" />
            </label>
            <label className="field">
              Height unit
              <select className="input" value={current.heightUnit || 'cm'} onChange={(e) => updateField('heightUnit', e.target.value)}>
                <option value="cm">Centimetres</option>
                <option value="in">Feet/inches</option>
              </select>
            </label>
            <label className="field">
              Weight
              <input className="input" type="number" value={current.weight ?? ''} onChange={(e) => updateField('weight', Number(e.target.value) || null)} placeholder="62" />
            </label>
            <label className="field">
              Weight unit
              <select className="input" value={current.weightUnit || 'kg'} onChange={(e) => updateField('weightUnit', e.target.value)}>
                <option value="kg">Kilograms</option>
                <option value="lb">Pounds</option>
              </select>
            </label>
            <label className="field sm:col-span-2">
              Fit notes
              <textarea className="input" rows="3" value={current.fitNotes || ''} onChange={(e) => updateField('fitNotes', e.target.value)} />
            </label>
          </div>
        </div>

        <div className="settings-card space-y-4">
          <h3 className="text-lg font-semibold">Fit preferences</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field">
              <span className="flex items-center gap-2">
                <span>Tops fit</span>
                <HelpPopover title="Tops fit" text="This is how you usually like your shirts, knitwear, and jackets to sit on the body: fitted, regular, relaxed, or oversized." />
              </span>
              <select className="input" value={current.fitPreferences?.tops || 'regular'} onChange={(e) => updateField('fitPreferences', { ...current.fitPreferences, tops: e.target.value })}>
                <option value="fitted">Fitted</option>
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="relaxed">Relaxed</option>
                <option value="oversized">Oversized</option>
              </select>
            </label>
            <label className="field">
              <span className="flex items-center gap-2">
                <span>Bottoms fit</span>
                <HelpPopover title="Bottoms fit" text="Use this to describe how your trousers, jeans, and skirts usually sit around the hips, thighs, and leg shape." />
              </span>
              <select className="input" value={current.fitPreferences?.bottoms || 'straight'} onChange={(e) => updateField('fitPreferences', { ...current.fitPreferences, bottoms: e.target.value })}>
                <option value="slim">Slim</option>
                <option value="straight">Straight</option>
                <option value="relaxed">Relaxed</option>
                <option value="wide-leg">Wide-leg</option>
                <option value="oversized">Oversized</option>
              </select>
            </label>
            <label className="field">
              <span className="flex items-center gap-2">
                <span>Upper-body volume</span>
                <HelpPopover title="Upper-body volume" text="Think about how roomy your shoulders, chest, and sleeves feel. 'Balanced' usually means easy and polished; 'relaxed' means more ease and space." />
              </span>
              <input className="input" value={current.fitPreferences?.upperBodyVolume || ''} onChange={(e) => updateField('fitPreferences', { ...current.fitPreferences, upperBodyVolume: e.target.value })} />
            </label>
            <label className="field">
              <span className="flex items-center gap-2">
                <span>Lower-body volume</span>
                <HelpPopover title="Lower-body volume" text="This describes how roomy your hips, thighs, and legs feel. It helps the app compare your preferred silhouette to the garments you own." />
              </span>
              <input className="input" value={current.fitPreferences?.lowerBodyVolume || ''} onChange={(e) => updateField('fitPreferences', { ...current.fitPreferences, lowerBodyVolume: e.target.value })} />
            </label>
          </div>
        </div>

        <div className="settings-card space-y-4 lg:col-span-2">
          <h3 className="text-lg font-semibold">Body proportions</h3>
          <div className="flex flex-wrap gap-2">
            {['Longer torso', 'Shorter torso', 'Longer legs', 'Shorter legs', 'Broad shoulders', 'Narrow shoulders'].map((option) => (
              <button
                key={option}
                type="button"
                className={current.proportions?.includes(option) ? 'pill active' : 'pill'}
                onClick={() => {
                  const selected = current.proportions || []
                  updateField('proportions', selected.includes(option) ? selected.filter((entry) => entry !== option) : [...selected, option])
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Body measurements</h3>
              <p className="mt-1 max-w-prose text-sm text-slate-600">
                Use a soft tape, stand tall, and keep it snug but not tight. Measure in a relaxed posture for the most wearable fit.
              </p>
            </div>
            <button type="button" className="btn-primary" onClick={addMeasurement}>Add measurement</button>
          </div>

          {measurements.length === 0 ? <p className="text-sm text-slate-500">No measurements recorded yet.</p> : null}

          <div className="grid gap-4 xl:grid-cols-2">
            {measurements.map((measurement, index) => {
              const guide = getGuide(measurement.name)
              return (
                <div key={`${measurement.name || 'measurement'}-${index}`} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <img src={guide.image} alt={guide.label} className="h-14 w-14 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-slate-200" />
                    <div className="min-w-0">
                      <p className="font-semibold">{guide.label}</p>
                      <p className="text-xs leading-snug text-slate-600">{guide.tip}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_90px_80px] gap-2">
                    <select className="input" value={measurement.name || 'chestCircumference'} onChange={(e) => updateMeasurement(index, 'name', e.target.value)}>
                      {Object.entries(measurementLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <input className="input" type="number" value={measurement.value ?? ''} onChange={(e) => updateMeasurement(index, 'value', Number(e.target.value) || null)} placeholder="0" />
                    <select className="input" value={measurement.unit || 'cm'} onChange={(e) => updateMeasurement(index, 'unit', e.target.value)}>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-[150px_1fr_auto] gap-2">
                    <input className="input" type="date" value={measurement.date || ''} onChange={(e) => updateMeasurement(index, 'date', e.target.value)} />
                    <input className="input" type="text" value={measurement.notes || ''} onChange={(e) => updateMeasurement(index, 'notes', e.target.value)} placeholder="Notes" />
                    <button type="button" className="btn-secondary" onClick={() => removeMeasurement(index)}>Remove</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}