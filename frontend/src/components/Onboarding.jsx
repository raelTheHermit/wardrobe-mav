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
        <div className="flex min-h-dvh items-center justify-center bg-[#f8f6f2] p-3 sm:p-5">
            <div className="w-full max-w-xl space-y-5 rounded-[26px] border border-[#e8e2dc] bg-[#fffdfa] p-5 shadow-[0_16px_45px_rgba(42,31,35,0.07)] sm:space-y-6 sm:p-8">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <p className="font-semibold text-accent">Step {step + 1} of {total}</p>
                        <button type="button" className="min-h-10 px-2 text-slate-500 hover:text-slate-800" onClick={onSkip}>Skip for now</button>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
                    </div>
                </div>

                {step === 0 ? (
                    <section className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">{name ? `Nice to meet you, ${name}.` : 'Nice to meet you.'} What’s your style?</h2>
                                <button
                                    type="button"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600"
                                    aria-label="Style helps the app suggest outfits that feel like you."
                                    title="Style helps the app suggest outfits that feel like you."
                                >
                                    ?
                                </button>
                            </div>
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
                            <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Which colors do you love wearing?</h2>
                            <p className="mt-1 text-slate-600">Choose as many as you like.</p>
                        </div>
                            <div className="grid grid-cols-2 gap-2 min-[390px]:grid-cols-3 sm:grid-cols-4">
                            {palette.map(([label, hex]) => {
                                const active = colors.includes(label)
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => toggleColor(label)}
                                        className={`flex min-h-11 items-center gap-2 rounded-xl border p-2.5 text-sm font-medium capitalize transition ${active ? 'border-accent bg-accent-soft' : 'border-[#e8e2dc] hover:bg-slate-50'}`}
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
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">How dressed up do you like to be?</h2>
                                <button
                                    type="button"
                                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600"
                                    aria-label="Formality bias sets your default polish level for outfit suggestions."
                                    title="Formality bias sets your default polish level for outfit suggestions."
                                >
                                    ?
                                </button>
                            </div>
                            <p className="mt-1 text-slate-600">This is your everyday default. Context changes it for events.</p>
                        </div>
                        <input type="range" min="1" max="5" value={formality} onChange={(event) => setFormality(Number(event.target.value))} className="w-full accent-violet-600" aria-label="Formality bias" />
                        <div className="flex justify-between text-xs text-slate-500"><span>Relaxed</span><span>Dressy</span></div>
                        <p className="text-center text-lg font-semibold">{formalityLabels[formality - 1]}</p>
                    </section>
                ) : null}

                <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between border-t border-[#eee8e2] bg-[#fffdfa]/95 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0">
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
