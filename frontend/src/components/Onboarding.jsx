import { useState } from 'react'
import { aestheticOptions } from '../data/aesthetics.js'

const palette = [
    ['ivory', '#f4f1e8'], ['white', '#ffffff'], ['black', '#17161d'], ['grey', '#8b8e94'],
    ['navy', '#1f2f4a'], ['blue', '#4a7fc1'], ['beige', '#cdb99a'], ['brown', '#6b4a32'],
    ['olive', '#6b7340'], ['green', '#2f6b4f'], ['burgundy', '#7a2236'], ['yellow', '#e8c547'],
]

const formalityLabels = ['Very relaxed', 'Easygoing', 'Balanced', 'Polished', 'Dressy']

export default function Onboarding({ name, initialPreferences, initialAesthetic, onFinish, onSkip }) {
    const [step, setStep] = useState(0)
    const [aesthetic, setAesthetic] = useState(initialAesthetic || aestheticOptions[0]?.id)
    const [colors, setColors] = useState(initialPreferences?.colors || [])
    const [formality, setFormality] = useState(initialPreferences?.formalityBias || 3)
    const total = 3

    const toggleColor = (color) => {
        setColors((current) => (
            current.includes(color) ? current.filter((entry) => entry !== color) : [...current, color]
        ))
    }

    const finish = () => {
        onFinish({
            aesthetic,
            preferences: {
                ...initialPreferences,
                styles: [aesthetic],
                colors: colors.length ? colors : initialPreferences?.colors,
                formalityBias: formality,
            },
        })
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
            <div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <p className="font-medium text-violet-700">Step {step + 1} of {total}</p>
                        <button type="button" className="text-slate-500 hover:text-slate-800" onClick={onSkip}>Skip for now</button>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
                        <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
                    </div>
                </div>

                {step === 0 ? (
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{name ? `Nice to meet you, ${name}.` : 'Nice to meet you.'} What’s your style?</h2>
                            <p className="mt-1 text-slate-600">Pick the look you reach for most. Outfits that match it get a boost.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {aestheticOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    aria-pressed={aesthetic === option.id}
                                    className={aesthetic === option.id ? 'pill active' : 'pill'}
                                    onClick={() => setAesthetic(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </section>
                ) : null}

                {step === 1 ? (
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Which colors do you love wearing?</h2>
                            <p className="mt-1 text-slate-600">Choose as many as you like.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {palette.map(([label, hex]) => {
                                const active = colors.includes(label)
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => toggleColor(label)}
                                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm font-medium capitalize transition ${active ? 'border-violet-600 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <span className="h-5 w-5 shrink-0 rounded-full ring-1 ring-slate-300" style={{ background: hex }} />
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </section>
                ) : null}

                {step === 2 ? (
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">How dressed up do you like to be?</h2>
                            <p className="mt-1 text-slate-600">This is your everyday default. Context changes it for events.</p>
                        </div>
                        <input type="range" min="1" max="5" value={formality} onChange={(event) => setFormality(Number(event.target.value))} className="w-full accent-violet-600" aria-label="Formality bias" />
                        <div className="flex justify-between text-xs text-slate-500"><span>Relaxed</span><span>Dressy</span></div>
                        <p className="text-center text-lg font-semibold">{formalityLabels[formality - 1]}</p>
                    </section>
                ) : null}

                <div className="flex items-center justify-between pt-2">
                    <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>Back</button>
                    {step < total - 1 ? (
                        <button type="button" className="btn-primary" onClick={() => setStep((current) => current + 1)}>Next</button>
                    ) : (
                        <button type="button" className="btn-primary" onClick={finish}>Finish setup</button>
                    )}
                </div>
            </div>
        </div>
    )
}
