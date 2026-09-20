import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isCollegePinTaken, updateUserProfile } from '../firebase/users'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

export default function VerifyPinPage() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // If user already has a PIN, skip to home
  useEffect(() => {
    if (userProfile?.collegePin) navigate('/', { replace: true })
  }, [userProfile, navigate])

  const [pin, setPin]           = useState('')
  const [pinStatus, setPinStatus] = useState('idle') // 'idle'|'checking'|'ok'|'taken'|'invalid'
  const [submitting, setSubmitting] = useState(false)

  // Debounced PIN uniqueness check
  useEffect(() => {
    if (!pin) { setPinStatus('idle'); return }
    const trimmed = pin.trim()
    if (trimmed.length < 4 || trimmed.length > 20) { setPinStatus('invalid'); return }

    setPinStatus('checking')
    const timer = setTimeout(async () => {
      const taken = await isCollegePinTaken(trimmed)
      setPinStatus(taken ? 'taken' : 'ok')
    }, 500)
    return () => clearTimeout(timer)
  }, [pin])

  async function handleSubmit(e) {
    e.preventDefault()
    if (pinStatus !== 'ok') return

    setSubmitting(true)
    try {
      await updateUserProfile(currentUser.uid, {
        collegePin: pin.trim().toUpperCase(),
      })
      await refreshProfile()
      toast.success('College PIN verified!', { icon: <Icon name="shield" size={16} /> })
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      toast.error('Could not save PIN. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const helperText = {
    idle:     'Enter the unique PIN provided by your institution.',
    checking: 'Checking PIN…',
    ok:       'PIN verified ✓',
    taken:    'This PIN has already been claimed by another student.',
    invalid:  'PIN must be 4–20 characters.',
  }[pinStatus]

  const helperColor = { ok: 'var(--brand-green)', taken: 'var(--brand-red)', invalid: 'var(--brand-red)' }[pinStatus] ?? 'var(--text-muted)'

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Icon name="shield" size={28} /></div>
          <h1 className="auth-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Verify College PIN</h1>
          <p className="auth-subtitle">
            Hey {userProfile?.name || 'there'}! We now require a college PIN to keep Palzy exclusive to verified students.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* PIN Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="verify-pin">Institution PIN *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                <Icon name="shield" size={16} />
              </span>
              <input
                id="verify-pin"
                className={`form-input ${pinStatus === 'taken' || pinStatus === 'invalid' ? 'error' : ''}`}
                style={{ paddingLeft: '2.5rem', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.1em', fontSize: 'var(--font-size-lg)', textAlign: 'center' }}
                type="text"
                placeholder="Enter your PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\s/g, ''))}
                maxLength={20}
                required
                autoFocus
              />
              {pinStatus === 'ok' && (
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-green)', display: 'flex' }}>
                  <Icon name="check" size={16} />
                </span>
              )}
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: helperColor }}>{helperText}</span>
          </div>

          {/* Info note */}
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(76, 215, 246, 0.08)',
            border: '1px solid rgba(76, 215, 246, 0.20)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: 'var(--space-2)',
            alignItems: 'flex-start',
          }}>
            <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Each PIN is unique and can only be used once. Contact your institution if you don't have one.</span>
          </div>

          <button
            id="btn-verify-pin"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={pinStatus !== 'ok' || submitting}
            style={{ width: '100%' }}
          >
            {submitting ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Verifying…</> : 'Verify & Continue →'}
          </button>
        </form>
      </div>
    </div>
  )
}
