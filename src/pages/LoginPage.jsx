import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

/* ── Tiny helpers ─────────────────────────────────────────── */
function PasswordStrength({ password }) {
  if (!password) return null
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['var(--brand-red)', 'var(--brand-yellow)', 'var(--brand-yellow)', 'var(--brand-green)', 'var(--brand-green)']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : 'var(--border-normal)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {score > 0 && <span style={{ fontSize: '0.7rem', color: colors[score] }}>{labels[score]}</span>}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const navigate = useNavigate()

  // 'signin' | 'signup' | 'forgot'
  const [tab, setTab] = useState('signin')

  // Sign-in fields
  const [siEmail, setSiEmail]       = useState('')
  const [siPassword, setSiPassword] = useState('')

  // Sign-up fields
  const [suName, setSuName]         = useState('')
  const [suEmail, setSuEmail]       = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suConfirm, setSuConfirm]   = useState('')
  const [showPass, setShowPass]     = useState(false)

  // Forgot-password
  const [fpEmail, setFpEmail]       = useState('')

  const [loading, setLoading]       = useState(false)

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmail(siEmail.trim(), siPassword)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (suPassword !== suConfirm) { toast.error('Passwords don\'t match!'); return }
    if (suPassword.length < 8)    { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await signUpWithEmail(suEmail.trim(), suPassword, suName.trim())
      toast.success('Account created! Pick a username 🎉')
      navigate('/setup-username', { replace: true })
    } catch (err) {
      toast.error(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!fpEmail.trim()) { toast.error('Enter your email'); return }
    setLoading(true)
    try {
      await resetPassword(fpEmail.trim())
      toast.success('Password reset link sent! Check your inbox 📬')
      setTab('signin')
    } catch (err) {
      toast.error(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🎓</div>
          <h1 className="auth-title">Palzy</h1>
          <p className="auth-subtitle">The social feed for your college crowd.</p>
        </div>

        {/* Tab switcher */}
        {tab !== 'forgot' && (
          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-full)',
            padding: 3,
            marginBottom: 'var(--space-6)',
            gap: 2,
          }}>
            {[['signin', 'Sign In'], ['signup', 'Sign Up']].map(([key, label]) => (
              <button
                key={key}
                id={`tab-${key}`}
                onClick={() => setTab(key)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 600,
                  transition: 'all var(--dur-fast)',
                  background: tab === key ? 'var(--brand-primary)' : 'transparent',
                  color: tab === key ? '#fff' : 'var(--text-secondary)',
                  boxShadow: tab === key ? '0 2px 8px rgba(108,99,255,0.35)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Sign In ───────────────────────────────────────── */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="si-email">Email</label>
              <input
                id="si-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={siEmail}
                onChange={e => setSiEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="si-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="si-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={siPassword}
                  onChange={e => setSiPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button id="btn-signin-email" type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in…</> : 'Sign In'}
            </button>

            <button type="button" onClick={() => setTab('forgot')} style={{ background: 'none', border: 'none', color: 'var(--text-brand)', fontSize: 'var(--font-size-xs)', cursor: 'pointer', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
              Forgot password?
            </button>

            <div className="divider-text">or</div>

            {/* Google */}
            <button id="btn-google-signin" type="button" className="google-btn" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              No account?{' '}
              <button type="button" onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', color: 'var(--text-brand)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'inherit' }}>
                Sign up
              </button>
            </p>
          </form>
        )}

        {/* ── Sign Up ───────────────────────────────────────── */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="su-name">Full name</label>
              <input
                id="su-name"
                type="text"
                className="form-input"
                placeholder="Ganesh Kumar"
                value={suName}
                onChange={e => setSuName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="su-email">Email</label>
              <input
                id="su-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={suEmail}
                onChange={e => setSuEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="su-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="su-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  value={suPassword}
                  onChange={e => setSuPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: '0.75rem', top: showPass || !suPassword ? '50%' : '35%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              <PasswordStrength password={suPassword} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="su-confirm">Confirm password</label>
              <input
                id="su-confirm"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${suConfirm && suConfirm !== suPassword ? 'error' : ''}`}
                placeholder="Repeat password"
                value={suConfirm}
                onChange={e => setSuConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {suConfirm && suConfirm !== suPassword && (
                <span className="form-error">Passwords don't match</span>
              )}
            </div>

            <button
              id="btn-signup-email"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || (suConfirm && suConfirm !== suPassword)}
              style={{ width: '100%' }}
            >
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating account…</> : 'Create Account'}
            </button>

            <div className="divider-text">or</div>

            <button id="btn-google-signup" type="button" className="google-btn" onClick={handleGoogle} disabled={loading}>
              <GoogleIcon />
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button type="button" onClick={() => setTab('signin')} style={{ background: 'none', border: 'none', color: 'var(--text-brand)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'inherit' }}>
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* ── Forgot Password ───────────────────────────────── */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🔑</div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>Forgot Password?</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Enter your email and we'll send a reset link.</div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="fp-email">Email</label>
              <input
                id="fp-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={fpEmail}
                onChange={e => setFpEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button id="btn-send-reset" type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending…</> : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => setTab('signin')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        <p style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          Student project · Your data stays within this app only.
        </p>
      </div>
    </div>
  )
}

/* ── Google logo SVG ─────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

/* ── Map Firebase error codes → readable messages ─────────── */
function friendlyError(code) {
  const map = {
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/email-already-in-use':   'An account with that email already exists.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/too-many-requests':      'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user':   'Sign-in popup was closed.',
  }
  return map[code] ?? 'Something went wrong. Please try again.'
}
