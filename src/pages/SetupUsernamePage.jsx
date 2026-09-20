import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isUsernameTaken, isCollegePinTaken, createUserProfile } from '../firebase/users'
import { uploadImage } from '../utils/cloudinary'
import { useDropzone } from 'react-dropzone'
import Icon from '../components/Icon'
import toast from 'react-hot-toast'

const BRANCHES = ['CSE', 'ECE']
const YEARS    = ['1st Year', '2nd Year', '3rd Year']

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export default function SetupUsernamePage() {
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  // Already has a profile? Don't show setup again — go straight to feed
  useEffect(() => {
    if (userProfile) navigate('/', { replace: true })
  }, [userProfile, navigate])

  const [username, setUsername]       = useState('')
  const [collegePin, setCollegePin]   = useState('')
  const [branch, setBranch]           = useState('')
  const [year, setYear]               = useState('')
  const [bio, setBio]                 = useState('')
  const [avatarFile, setAvatarFile]   = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.photoURL || '')
  const [usernameStatus, setUsernameStatus] = useState('idle') // 'idle'|'checking'|'ok'|'taken'|'invalid'
  const [pinStatus, setPinStatus]     = useState('idle')       // 'idle'|'checking'|'ok'|'taken'|'invalid'
  const [submitting, setSubmitting]   = useState(false)

  // Debounced username check
  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); return }
    if (!USERNAME_RE.test(username)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      const taken = await isUsernameTaken(username)
      setUsernameStatus(taken ? 'taken' : 'ok')
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  // Debounced college PIN check
  useEffect(() => {
    if (!collegePin) { setPinStatus('idle'); return }
    const trimmed = collegePin.trim()
    if (trimmed.length < 4 || trimmed.length > 20) { setPinStatus('invalid'); return }

    setPinStatus('checking')
    const timer = setTimeout(async () => {
      const taken = await isCollegePinTaken(trimmed)
      setPinStatus(taken ? 'taken' : 'ok')
    }, 500)
    return () => clearTimeout(timer)
  }, [collegePin])

  // Avatar dropzone
  const onDrop = useCallback((accepted) => {
    const file = accepted[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    noClick: false,
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (usernameStatus !== 'ok' || pinStatus !== 'ok') return

    setSubmitting(true)
    try {
      let photoURL = currentUser.photoURL || ''
      if (avatarFile) {
        photoURL = await uploadImage(avatarFile, 'avatars')
      }

      await createUserProfile(currentUser.uid, {
        username,
        name: currentUser.displayName || username,
        photoURL,
        branch: branch || '',
        year: year || '',
        bio,
        showBranch: true,
        showYear: true,
        collegePin: collegePin.trim(),
      })

      await refreshProfile()
      toast.success('Welcome to Palzy!', { icon: <Icon name="graduationCap" size={16} /> })
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const usernameHelperText = {
    idle:     'Pick a unique handle — 3–20 chars, letters/numbers/underscores only.',
    checking: 'Checking availability…',
    ok:       `@${username} is available! ✓`,
    taken:    `@${username} is already taken.`,
    invalid:  'Only lowercase letters, numbers, and underscores (3–20 chars).',
  }[usernameStatus]

  const usernameColor = { ok: 'var(--brand-green)', taken: 'var(--brand-red)', invalid: 'var(--brand-red)' }[usernameStatus] ?? 'var(--text-muted)'

  const pinHelperText = {
    idle:     'Enter the unique PIN provided by your institution.',
    checking: 'Checking PIN…',
    ok:       'PIN verified ✓',
    taken:    'This PIN has already been claimed by another student.',
    invalid:  'PIN must be 4–20 characters.',
  }[pinStatus]

  const pinColor = { ok: 'var(--brand-green)', taken: 'var(--brand-red)', invalid: 'var(--brand-red)' }[pinStatus] ?? 'var(--text-muted)'

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon"><Icon name="sparkles" size={28} /></div>
          <h1 className="auth-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Set up your profile</h1>
          <p className="auth-subtitle">This is how your batchmates will see you.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Avatar picker */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              {...getRootProps()}
              style={{
                width: 88, height: 88,
                borderRadius: '50%',
                border: `2px dashed ${isDragActive ? 'var(--brand-primary)' : 'var(--border-normal)'}`,
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--bg-elevated)',
                transition: 'border-color var(--dur-fast)',
              }}
            >
              <input {...getInputProps()} id="avatar-upload" />
              {avatarPreview
                ? <img src={avatarPreview} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)' }}>
                    <Icon name="camera" size={26} />
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>Upload photo</span>
                  </div>
                )
              }
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Tap to change photo</span>
          </div>

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 'var(--font-size-base)' }}>@</span>
              <input
                id="username"
                className={`form-input ${usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'error' : ''}`}
                style={{ paddingLeft: '2rem' }}
                type="text"
                placeholder="yourname"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                maxLength={20}
                required
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: usernameColor }}>{usernameHelperText}</span>
          </div>

          {/* College PIN */}
          <div className="form-group">
            <label className="form-label" htmlFor="college-pin">College PIN *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                <Icon name="shield" size={16} />
              </span>
              <input
                id="college-pin"
                className={`form-input ${pinStatus === 'taken' || pinStatus === 'invalid' ? 'error' : ''}`}
                style={{ paddingLeft: '2.5rem', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.1em' }}
                type="text"
                placeholder="Enter institution PIN"
                value={collegePin}
                onChange={e => setCollegePin(e.target.value.replace(/\s/g, ''))}
                maxLength={20}
                required
              />
              {pinStatus === 'ok' && (
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--brand-green)', display: 'flex' }}>
                  <Icon name="check" size={16} />
                </span>
              )}
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: pinColor }}>{pinHelperText}</span>
          </div>

          {/* Branch & Year row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="branch">Branch <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <select id="branch" className="form-input form-select" value={branch} onChange={e => setBranch(e.target.value)}>
                <option value="">Select…</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="year">Year <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <select id="year" className="form-input form-select" value={year} onChange={e => setYear(e.target.value)}>
                <option value="">Select…</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div className="form-group">
            <label className="form-label" htmlFor="bio">Bio <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <textarea
              id="bio"
              className="form-input form-textarea"
              placeholder="Tell your batchmates a little about yourself…"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={160}
              rows={3}
            />
            <span className="form-hint">{bio.length}/160</span>
          </div>

          <button
            id="btn-complete-profile"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={usernameStatus !== 'ok' || pinStatus !== 'ok' || submitting}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {submitting ? <><div className="spinner" />Setting up…</> : 'Complete Profile →'}
          </button>
        </form>
      </div>
    </div>
  )
}
