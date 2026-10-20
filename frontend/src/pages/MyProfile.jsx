import { createDefaultProfile } from '../utils/bodyProfile.js'

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
  shoulderWidth: {
    label: 'Shoulder width',
    image: '/images/measurement-guides/shoulder.svg',
    tip: 'Measure straight across your upper back from shoulder bone to shoulder bone.',
  },
  chestCircumference: {
    label: 'Chest circumference',
    image: '/images/measurement-guides/chest.svg',
    tip: 'Wrap the tape around the fullest part of the chest, keeping it level under your arms.',
  },
  waistCircumference: {
    label: 'Waist circumference',
    image: '/images/measurement-guides/waist.svg',
    tip: 'Measure around the natural waist, usually the narrowest part of your torso.',
  },
  hipCircumference: {
    label: 'Hip circumference',
    image: '/images/measurement-guides/hip.svg',
    tip: 'Measure around the fullest part of your hips and seat, standing naturally.',
  },
  inseam: {
    label: 'Inseam',
    image: '/images/measurement-guides/inseam.svg',
    tip: 'Measure from the crotch seam to the bottom of the ankle, keeping the leg straight.',
  },
  outseam: {
    label: 'Outseam',
    image: '/images/measurement-guides/inseam.svg',
    tip: 'Measure from the waistband to the floor or hem at the outside of the leg.',
  },
  sleeveLength: {
    label: 'Sleeve length',
    image: '/images/measurement-guides/sleeve.svg',
    tip: 'Measure from the shoulder edge down to the wrist bone with the arm relaxed.',
  },
  armCircumference: {
    label: 'Arm circumference',
    image: '/images/measurement-guides/sleeve.svg',
    tip: 'Measure around the fullest part of the upper arm, relaxed but not tucked in.',
  },
  thighCircumference: {
    label: 'Thigh circumference',
    image: '/images/measurement-guides/inseam.svg',
    tip: 'Measure around the fullest part of the upper thigh, standing with weight even.',
  },
  neckCircumference: {
    label: 'Neck circumference',
    image: '/images/measurement-guides/shoulder.svg',
    tip: 'Wrap the tape around the base of the neck, keeping it comfortable and level.',
  },
}

function updateProfile(profile, updater) {
  return { ...createDefaultProfile(profile), ...updater }
}

export default function MyProfile({ profile, onProfileChange, onClearProfile, onSaveProfile }) {
  const current = profile || createDefaultProfile()
  const measurements = current.measurements || []
  const updateField = (field, value) => onProfileChange({ ...current, [field]: value })

  const updateMeasurement = (index, field, value) => {
    const next = [...measurements]
    next[index] = { ...next[index], [field]: value }
    onProfileChange({ ...current, measurements: next })
  }

  const addMeasurement = () => {
    onProfileChange({
      ...current,
      measurements: [...measurements, { name: 'chestCircumference', value: '', unit: 'cm', notes: '', confidence: 'estimated' }],
    })
  }

  const removeMeasurement = (index) => {
    onProfileChange({ ...current, measurements: measurements.filter((_, itemIndex) => itemIndex !== index) })
  }

  const getGuide = (name) => measurementGuides[name] || measurementGuides.chestCircumference

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">My profile</p>
          <h2>Body profile</h2>
        </div>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClearProfile}>Clear profile</button>
          <button type="button" className="primary-button" onClick={onSaveProfile}>Save profile</button>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Basic body information</h3>
          <div className="form-grid">
            <label>
              Height
              <input type="number" value={current.height ?? ''} onChange={(event) => updateField('height', Number(event.target.value) || null)} placeholder="170" />
            </label>
            <label>
              Height unit
              <select value={current.heightUnit || 'cm'} onChange={(event) => updateField('heightUnit', event.target.value)}>
                <option value="cm">Centimetres</option>
                <option value="in">Feet/inches</option>
              </select>
            </label>
            <label>
              Weight
              <input type="number" value={current.weight ?? ''} onChange={(event) => updateField('weight', Number(event.target.value) || null)} placeholder="62" />
            </label>
            <label>
              Weight unit
              <select value={current.weightUnit || 'kg'} onChange={(event) => updateField('weightUnit', event.target.value)}>
                <option value="kg">Kilograms</option>
                <option value="lb">Pounds</option>
              </select>
            </label>
            <label className="full-width">
              Fit notes
              <textarea value={current.fitNotes || ''} onChange={(event) => updateField('fitNotes', event.target.value)} rows="3" />
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3>Body measurements</h3>
          <div className="measurement-helper-card">
            <div>
              <strong>How to measure</strong>
              <p>Use a soft tape, stand tall, and keep the tape snug but not tight. Measure in a relaxed posture for the most wearable fit.</p>
            </div>
          </div>
          {measurements.length === 0 ? <p className="muted-text">No measurements recorded yet.</p> : null}
          {measurements.map((measurement, index) => {
            const guide = getGuide(measurement.name)
            return (
              <div className="measurement-entry" key={`${measurement.name || 'measurement'}-${index}`}>
                <div className="measurement-guide">
                  <img src={guide.image} alt={guide.label} />
                  <div>
                    <strong>{guide.label}</strong>
                    <small>{guide.tip}</small>
                  </div>
                </div>

                <div className="measurement-fields">
                  <div className="measurement-input-row">
                    <select value={measurement.name || 'chestCircumference'} onChange={(event) => updateMeasurement(index, 'name', event.target.value)}>
                      {Object.entries(measurementLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <input type="number" value={measurement.value ?? ''} onChange={(event) => updateMeasurement(index, 'value', Number(event.target.value) || null)} placeholder="0" />
                    <select value={measurement.unit || 'cm'} onChange={(event) => updateMeasurement(index, 'unit', event.target.value)}>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                    </select>
                  </div>
                  <div className="measurement-input-row measurement-meta-row">
                    <input type="date" value={measurement.date || ''} onChange={(event) => updateMeasurement(index, 'date', event.target.value)} />
                    <input type="text" value={measurement.notes || ''} onChange={(event) => updateMeasurement(index, 'notes', event.target.value)} placeholder="Notes" />
                    <button type="button" className="secondary-button" onClick={() => removeMeasurement(index)}>Remove</button>
                  </div>
                </div>
              </div>
            )
          })}
          <button type="button" className="primary-button" onClick={addMeasurement}>Add measurement</button>
        </div>

        <div className="settings-card">
          <h3>Body proportions</h3>
          <div className="pill-row">
            {['Longer torso', 'Shorter torso', 'Longer legs', 'Shorter legs', 'Broad shoulders', 'Narrow shoulders'].map((option) => (
              <button
                key={option}
                type="button"
                className={current.proportions?.includes(option) ? 'pill active' : 'pill'}
                onClick={() => {
                  const selected = current.proportions || []
                  const next = selected.includes(option)
                    ? selected.filter((entry) => entry !== option)
                    : [...selected, option]
                  updateField('proportions', next)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-card">
          <h3>Fit preferences</h3>
          <div className="form-grid">
            <label>
              Tops fit
              <select value={current.fitPreferences?.tops || 'regular'} onChange={(event) => updateField('fitPreferences', { ...current.fitPreferences, tops: event.target.value })}>
                <option value="fitted">Fitted</option>
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="relaxed">Relaxed</option>
                <option value="oversized">Oversized</option>
              </select>
            </label>
            <label>
              Bottoms fit
              <select value={current.fitPreferences?.bottoms || 'straight'} onChange={(event) => updateField('fitPreferences', { ...current.fitPreferences, bottoms: event.target.value })}>
                <option value="slim">Slim</option>
                <option value="straight">Straight</option>
                <option value="relaxed">Relaxed</option>
                <option value="wide-leg">Wide-leg</option>
                <option value="oversized">Oversized</option>
              </select>
            </label>
            <label>
              Preferred upper-body volume
              <input value={current.fitPreferences?.upperBodyVolume || ''} onChange={(event) => updateField('fitPreferences', { ...current.fitPreferences, upperBodyVolume: event.target.value })} />
            </label>
            <label>
              Preferred lower-body volume
              <input value={current.fitPreferences?.lowerBodyVolume || ''} onChange={(event) => updateField('fitPreferences', { ...current.fitPreferences, lowerBodyVolume: event.target.value })} />
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
