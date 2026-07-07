import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signInWithGoogle()
      // AuthProvider will detect if profile exists, routing handled in App.jsx
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      toast.error('Sign-in failed. Please try again.')
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
          <p className="auth-subtitle">
            The social feed for your college crowd — just you and your batchmates.
          </p>
        </div>

        {/* Features list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {[
            ['💬', 'Post whatever\'s on your mind'],
            ['📸', 'Share photos with your campus'],
            ['❤️', 'Like and comment on posts'],
            ['🔒', 'Exclusively for your college'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              <span style={{ fontSize: '1.1rem' }}>{icon}</span>
              {text}
            </div>
          ))}
        </div>

        <div className="divider-text" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-2)' }}>
          Get started
        </div>

        {/* Google Sign-in Button */}
        <button
          id="btn-google-signin"
          className="google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          aria-label="Sign in with Google"
        >
          {loading ? (
            <div className="spinner" style={{ borderTopColor: '#6c63ff' }} />
          ) : (
            <svg className="google-btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
          By signing in you agree that this is a student project and your data stays within this app only.
        </p>
      </div>
    </div>
  )
}
