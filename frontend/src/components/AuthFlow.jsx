import { useEffect, useRef, useState } from 'react'

const highlights = [
  ['Closet-aware', 'Recommendations come only from clothes you actually own.'],
  ['Explained, not magic', 'Every outfit shows why it scored the way it did.'],
  ['Works offline', 'Changes queue up and sync when you reconnect.'],
]

function Field({ id, label, error, hint, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`input ${error ? '!border-rose-400' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
      {error ? <p id={`${id}-error`} className="text-xs font-normal text-rose-600">{error}</p> : null}
      {!error && hint ? <p id={`${id}-hint`} className="text-xs font-normal text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function AuthFlow({ accounts = [], canClose = false, onSignUp, onLogin, onResetPassword, onGuest, onClose }) {
  const [view, setView] = useState('welcome')
  const [form, setForm] = useState({ name: '', username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [resetNotice, setResetNotice] = useState('')
  const headingRef = useRef(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [view])

  const go = (next) => {
    setErrors({})
    setView(next)
  }

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  const submitSignUp = async (event) => {
    event.preventDefault()
    const next = {}

    if (!form.name.trim()) next.name = 'Tell us what to call you.'
    if (!form.username.trim()) next.username = 'Choose a username.'
    else if (accounts.some((account) => String(account.username || account.name || account.email || '').trim().toLowerCase() === form.username.trim().toLowerCase())) {
      next.username = 'That username is already taken.'
    }
    if (!form.password || form.password.length < 6) next.password = 'Use a password with at least 6 characters.'

    setErrors(next)
    if (!Object.keys(next).length) {
      try {
        await onSignUp({ name: form.name.trim(), username: form.username.trim(), password: form.password })
      } catch (error) {
        const message = error?.message || 'Account creation failed. Please try again.'
        setErrors({ username: error?.status === 409 ? 'That username is already taken. Sign in or choose another username.' : message })
      }
    }
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    const next = {}
    const identifier = form.username.trim()

    if (!identifier) {
      next.username = 'Enter your username or name.'
    }
    if (!form.password) {
      next.password = 'Enter your password.'
    }

    setErrors(next)
    if (Object.keys(next).length) return

    try {
      const signedIn = await onLogin(identifier, form.password)
      if (!signedIn) setErrors({ username: 'No account matches that username or name.', password: 'Check your password and try again.', missing: true })
    } catch {
      setErrors({ username: 'Sign in failed. Check your details and connection, then try again.' })
    }
  }

  const submitForgotPassword = (event) => {
    event.preventDefault()
    const next = {}
    const identifier = form.username.trim()

    if (!identifier) {
      next.username = 'Enter the username tied to your account.'
    }
    if (!form.password || form.password.length < 6) {
      next.password = 'Choose a new password with at least 6 characters.'
    }

    setErrors(next)
    if (Object.keys(next).length) return

    const matchedAccount = accounts.find((account) => {
      const accountUsername = String(account.username || '').trim().toLowerCase()
      const accountName = String(account.name || '').trim().toLowerCase()
      const accountEmail = String(account.email || '').trim().toLowerCase()
      return accountUsername === identifier.toLowerCase() || accountName === identifier.toLowerCase() || accountEmail === identifier.toLowerCase()
    })

    if (!matchedAccount) {
      setErrors({ username: 'We could not find an account for that username or name.' })
      return
    }

    const reset = onResetPassword ? onResetPassword({ username: matchedAccount.username || matchedAccount.name || matchedAccount.email, password: form.password }) : true
    if (reset) {
      setResetNotice('Password updated. Sign in with your new password.')
      setForm((current) => ({ ...current, username: '', password: '' }))
      setErrors({})
      setView('login')
    } else {
      setErrors({ username: 'We could not update that password. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative flex flex-col justify-between gap-5 overflow-hidden bg-[#352631] px-6 py-6 text-white sm:gap-10 sm:px-12 sm:py-10">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <p className="relative text-lg font-bold tracking-tight">fitzii<span className="text-[#e4bdc8]">.</span></p>
        <div className="space-y-6">
          <h1 className="relative max-w-md text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">Get dressed with less guesswork.</h1>
          <ul className="hidden space-y-4 sm:block">
            {highlights.map(([title, text]) => (
              <li key={title}>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-slate-300">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-xs text-slate-400 lg:block">Your wardrobe stays on your device until you choose to sync it.</p>
      </aside>

      <main className="flex items-start justify-center px-5 py-7 sm:items-center sm:p-12">
        <div className="w-full max-w-sm space-y-6">
          {canClose ? (
            <button type="button" className="text-sm font-medium text-slate-500 hover:text-slate-800" onClick={onClose}>← Back to app</button>
          ) : null}

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

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div>
                <button type="button" className="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-accent hover:bg-accent-soft" onClick={onGuest}>Try it as a guest</button>
                <p className="mt-1 text-center text-xs text-slate-500">Guest data stays in this browser only.</p>
              </div>
            </>
          ) : null}

          {view === 'signup' ? (
            <form onSubmit={submitSignUp} noValidate className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Create your account</h2>
                <p className="mt-1 text-slate-600">Next, a short style quiz personalizes your suggestions.</p>
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
                id="su-username"
                label="Username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={setField('username')}
                error={errors.username}
                placeholder="your-handle"
                hint="This matches the backend UserAccount model."
              />

              <Field
                id="su-password"
                label="Password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                placeholder="At least 6 characters"
              />

              <button type="submit" className="btn-primary w-full !py-3">Continue</button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => go('login')}>Log in</button>
              </p>

              <button type="button" className="block w-full text-center text-sm text-slate-500 hover:text-slate-800" onClick={() => go('welcome')}>← Back</button>
            </form>
          ) : null}

          {view === 'login' ? (
            <form onSubmit={submitLogin} noValidate className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Welcome back</h2>
                <p className="mt-1 text-slate-600">{accounts.length ? 'Pick your account or enter your email.' : 'Enter the email you signed up with.'}</p>
              </div>

              {accounts.length ? (
                <ul className="space-y-2">
                  {accounts.map((account) => (
                    <li key={account.id}>
                      <button
                        type="button"
                        onClick={() => onLogin(account.username || account.name || account.email, account.password || '')}
                        className="flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-[#e8e2dc] bg-white p-3 text-left transition hover:border-accent/40 hover:bg-[#fbfaf8]"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-bold text-accent">{String(account.name || account.username || 'U').slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{account.name || account.username}</span>
                          <span className="block truncate text-xs text-slate-500">{account.username || account.name}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Field
                id="li-username"
                label="Username or name"
                type="text"
                autoComplete="username"
                autoFocus={!accounts.length}
                value={form.username}
                onChange={setField('username')}
                error={errors.username}
                placeholder="your username or your name"
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

              {errors.missing ? (
                <p className="text-sm text-slate-600">
                  New here?{' '}
                  <button type="button" className="font-semibold text-accent hover:underline" onClick={() => go('signup')}>Create an account</button>
                </p>
              ) : null}

              <button type="button" className="min-h-10 text-sm font-medium text-accent hover:underline" onClick={() => {
                setErrors({})
                setResetNotice('')
                setView('forgot')
              }}>
                Forgot password?
              </button>

              {resetNotice ? <p className="text-sm text-emerald-600">{resetNotice}</p> : null}

              <button type="submit" className="btn-primary w-full !py-3">Log in</button>
              <button type="button" className="block w-full text-center text-sm text-slate-500 hover:text-slate-800" onClick={() => go('welcome')}>← Back</button>
            </form>
          ) : null}

          {view === 'forgot' ? (
            <form onSubmit={submitForgotPassword} noValidate className="space-y-5">
              <div>
                <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">Reset your password</h2>
                <p className="mt-1 text-slate-600">Enter the account email and choose a new password.</p>
              </div>

              <Field
                id="fp-username"
                label="Username or name"
                type="text"
                autoComplete="username"
                autoFocus
                value={form.username}
                onChange={setField('username')}
                error={errors.username}
                placeholder="your username or your name"
              />

              <Field
                id="fp-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={setField('password')}
                error={errors.password}
                placeholder="At least 6 characters"
              />

              <button type="submit" className="btn-primary w-full !py-3">Update password</button>
              <button type="button" className="block w-full text-center text-sm text-slate-500 hover:text-slate-800" onClick={() => go('login')}>← Back to login</button>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  )
}
