import { useEffect, useRef, useState } from 'react'

const highlights = [
  ['Closet-aware', 'Recommendations come only from clothes you actually own.'],
  ['Explained, not magic', 'Every outfit shows why it scored the way it did.'],
  ['Works offline', 'Changes queue up and sync when you reconnect.'],
]

function Field({ id, label, error, hint, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = props.type === 'password'

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          className={`input ${error ? '!border-rose-400' : ''}`}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
          type={isPassword ? (show ? 'text' : 'password') : props.type}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-violet-700"
            onClick={() => setShow((current) => !current)}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        ) : null}
      </div>
      {error ? <p id={`${id}-error`} className="text-xs font-normal text-rose-600">{error}</p> : null}
      {!error && hint ? <p id={`${id}-hint`} className="text-xs font-normal text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function AuthFlow({ onSignUp, onLogin }) {
  const [view, setView] = useState('welcome')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [view])

  const go = (next) => {
    setErrors({})
    setSubmitError('')
    setView(next)
  }

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
    if (submitError) setSubmitError('')
  }

  const submitSignUp = async (event) => {
    event.preventDefault()
    const next = {}
    const email = form.email.trim()

    if (!form.name.trim()) next.name = 'Tell us what to call you.'
    if (!email) next.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Use a valid email address.'
    if (!form.password || form.password.length < 8) next.password = 'Use a password with at least 8 characters.'

    setErrors(next)
    if (Object.keys(next).length) return

    try {
      setSubmitError('')
      await onSignUp({ name: form.name.trim(), email, password: form.password })
    } catch (error) {
      setSubmitError(error?.message || 'That email is already in use.')
    }
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    const next = {}
    const email = form.email.trim()

    if (!email) next.email = 'Enter your email.'
    if (!form.password) next.password = 'Enter your password.'

    setErrors(next)
    if (Object.keys(next).length) return

    try {
      setSubmitError('')
      await onLogin({ email, password: form.password })
    } catch (error) {
      setSubmitError(error?.message || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="flex flex-col justify-between gap-10 bg-slate-950 p-8 text-white sm:p-12">
        <p className="text-lg font-bold tracking-tight">Fitzii</p>
        <div className="space-y-6">
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">Get dressed with less guesswork.</h1>
          <ul className="space-y-4">
            {highlights.map(([title, text]) => (
              <li key={title}>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-300">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-xs text-slate-400 lg:block">Your wardrobe stays in your private account until you choose to sync.</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-6">
          {view === 'welcome' ? (
            <>
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Welcome to Fitzii</h2>
                <p className="mt-1 text-slate-600">Set up takes about a minute. You can change everything later.</p>
              </div>

              <div className="space-y-3">
                <button type="button" className="btn-primary w-full !py-3" onClick={() => go('signup')}>Create an account</button>
                <button type="button" className="btn-secondary w-full !py-3" onClick={() => go('login')}>I already have an account</button>
              </div>
            </>
          ) : null}

          {view === 'signup' ? (
            <form onSubmit={submitSignUp} noValidate className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Create your account</h2>
                <p className="mt-1 text-slate-600">Next, we personalize your outfit suggestions.</p>
              </div>

              <Field
                id="su-name"
                label="Name"
                autoComplete="given-name"
                autoFocus
                value={form.name}
                onChange={setField('name')}
                error={errors.name}
                placeholder="Your first name"
              />

              <Field
                id="su-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={setField('email')}
                error={errors.email}
                placeholder="you@example.com"
              />

              <Field
                id="su-password"
                label="Password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                placeholder="At least 8 characters"
              />

              {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

              <button type="submit" className="btn-primary w-full !py-3">Continue</button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <button type="button" className="font-semibold text-violet-700 hover:underline" onClick={() => go('login')}>Log in</button>
              </p>

              <button type="button" className="block w-full text-center text-sm text-slate-500 hover:text-slate-800" onClick={() => go('welcome')}>← Back</button>
            </form>
          ) : null}

          {view === 'login' ? (
            <form onSubmit={submitLogin} noValidate className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Welcome back</h2>
                <p className="mt-1 text-slate-600">Enter the email and password for your account.</p>
              </div>

              <Field
                id="li-email"
                label="Email"
                type="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={setField('email')}
                error={errors.email}
                placeholder="you@example.com"
              />

              <Field
                id="li-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                placeholder="Enter your password"
              />

              {submitError ? <p className="text-sm text-rose-600">{submitError}</p> : null}

              <button type="submit" className="btn-primary w-full !py-3">Log in</button>
              <button type="button" className="block w-full text-center text-sm text-slate-500 hover:text-slate-800" onClick={() => go('welcome')}>← Back</button>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  )
}

