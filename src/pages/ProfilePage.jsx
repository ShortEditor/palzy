import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getUserByUsername, updateUserProfile } from '../firebase/users'
import { getUserPosts, batchCheckLikes } from '../firebase/posts'
import { isFollowing, followUser, unfollowUser, syncFollowCounts } from '../firebase/follows'
import { uploadImage } from '../utils/cloudinary'
import PostCard from '../components/PostCard'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import VerifiedBadge from '../components/VerifiedBadge'
import FollowButton from '../components/FollowButton'
import FollowListModal from '../components/FollowListModal'
import ImageCropModal from '../components/ImageCropModal'
import toast from 'react-hot-toast'

const BRANCHES = ['CSE', 'ECE']
const YEARS    = ['1st Year', '2nd Year', '3rd Year']

export default function ProfilePage() {
  const { username } = useParams()
  const { currentUser, userProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile]       = useState(null)
  const [posts, setPosts]           = useState([])
  const [likeMap, setLikeMap]       = useState({})
  const [cursor, setCursor]         = useState(null)
  const [hasMore, setHasMore]       = useState(true)
  const [loading, setLoading]       = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [notFound, setNotFound]     = useState(false)

  // Edit modal
  const [editing, setEditing]       = useState(false)
  const [editBio, setEditBio]       = useState('')
  const [editBranch, setEditBranch] = useState('')
  const [editYear, setEditYear]     = useState('')
  const [editAvatar, setEditAvatar] = useState(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState('')
  const [editBanner, setEditBanner] = useState(null)
  const [editBannerPreview, setEditBannerPreview] = useState('')
  const [saving, setSaving]         = useState(false)
  const [editShowBranch, setEditShowBranch] = useState(true)
  const [editShowYear, setEditShowYear]     = useState(true)

  // Crop modal
  const [cropTarget, setCropTarget] = useState(null) // 'avatar' | 'banner' | null
  const [rawCropSrc, setRawCropSrc] = useState('')   // object URL of the raw picked image

  const isOwn = currentUser && userProfile?.username === username
  const [followState, setFollowState] = useState(false)
  const [followModal, setFollowModal] = useState(null) // 'followers' | 'following' | null

  // ─── Load profile ─────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setPosts([])
    setCursor(null)
    setHasMore(true)

    getUserByUsername(username).then(async p => {
      if (!p) { setNotFound(true); setLoading(false); return }
      
      // Fetch fresh, accurate follow counts and heal database if they drifted
      const syncedCounts = await syncFollowCounts(p.uid)
      if (syncedCounts) {
        p.followerCount = syncedCounts.followerCount
        p.followingCount = syncedCounts.followingCount
      }
      
      setProfile(p)
      // Check follow state for non-own profiles
      if (currentUser && currentUser.uid !== p.uid) {
        const state = await isFollowing(currentUser.uid, p.uid)
        setFollowState(state)
      }
      setLoading(false)
    })
  }, [username])

  // ─── Load posts once profile is loaded ────────────────────
  const fetchPosts = useCallback(async (cur = null) => {
    if (!profile) return
    if (cur === null) setLoadingPosts(true)
    try {
      const { posts: newPosts, nextCursor, hasMore: more } = await getUserPosts(profile.uid, cur)
      const newLikeMap = await batchCheckLikes(newPosts.map(p => p.id), currentUser.uid)
      setLikeMap(prev => ({ ...prev, ...newLikeMap }))
      setPosts(prev => cur ? [...prev, ...newPosts] : newPosts)
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPosts(false)
    }
  }, [profile, currentUser.uid])

  useEffect(() => { if (profile) fetchPosts(null) }, [profile])  // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit() {
    setEditBio(profile.bio ?? '')
    setEditBranch(profile.branch ?? '')
    setEditYear(profile.year ?? '')
    setEditShowBranch(profile.showBranch !== false)
    setEditShowYear(profile.showYear !== false)
    setEditAvatarPreview(profile.photoURL ?? '')
    setEditBannerPreview(profile.bannerURL ?? '')
    setEditAvatar(null)
    setEditBanner(null)
    setEditing(true)
  }

  function handleEditAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setRawCropSrc(URL.createObjectURL(file))
    setCropTarget('avatar')
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleEditBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setRawCropSrc(URL.createObjectURL(file))
    setCropTarget('banner')
    e.target.value = ''
  }

  function handleCropDone(croppedFile) {
    const preview = URL.createObjectURL(croppedFile)
    if (cropTarget === 'avatar') {
      setEditAvatar(croppedFile)
      setEditAvatarPreview(preview)
    } else {
      setEditBanner(croppedFile)
      setEditBannerPreview(preview)
    }
    setCropTarget(null)
    setRawCropSrc('')
  }

  function handleCropCancel() {
    setCropTarget(null)
    setRawCropSrc('')
  }

  async function handleSave() {
    setSaving(true)
    try {
      let photoURL  = profile.photoURL
      let bannerURL = profile.bannerURL
      if (editAvatar) photoURL  = await uploadImage(editAvatar, 'avatars')
      if (editBanner) bannerURL = await uploadImage(editBanner, 'banners')
      await updateUserProfile(profile.uid, {
        bio: editBio,
        branch: editBranch,
        year: editYear,
        photoURL,
        bannerURL,
        showBranch: editShowBranch,
        showYear: editShowYear
      })
      if (isOwn) await refreshProfile()
      setProfile(prev => ({
        ...prev,
        bio: editBio,
        branch: editBranch,
        year: editYear,
        photoURL,
        bannerURL,
        showBranch: editShowBranch,
        showYear: editShowYear
      }))
      setEditing(false)
      toast.success('Profile updated!')
    } catch {
      toast.error('Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  function handlePostDeleted(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) return (
    <div className="feed-column" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-12)' }}>
      <div className="spinner spinner-lg" />
    </div>
  )

  if (notFound) return (
    <div className="feed-column">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><Icon name="arrow_left" size={20} /></button>
        <h1>Profile</h1>
      </div>
      <div className="empty-state" style={{ marginTop: 'var(--space-12)' }}>
        <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Icon name="ghost" size={40} /></div>
        <div className="empty-state-title">User not found</div>
        <div className="empty-state-body">@{username} doesn't exist yet.</div>
      </div>
    </div>
  )

  return (
    <div className="feed-column">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {profile.name}
          {profile.isVerified && <VerifiedBadge size={18} />}
        </h1>
      </div>

      {/* Banner */}
      <div
        className="profile-banner"
        style={{
          backgroundImage: profile.bannerURL ? `url(${profile.bannerURL})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      />

      {/* Profile info */}
      <div className="profile-info">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="profile-avatar-wrap">
            <Avatar src={profile.photoURL} name={profile.name} size="2xl" />
          </div>
          {isOwn && (
            <button id="btn-edit-profile" className="btn btn-outline btn-sm" onClick={openEdit}>
              <Icon name="pencil" size={14} /> Edit profile
            </button>
          )}
        </div>

        <div className="profile-name" style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {profile.name}
          {profile.isVerified && <VerifiedBadge size={20} />}
        </div>
        <div className="profile-handle">@{profile.username}</div>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}

        {/* Follower / Following counts — clickable to open list */}
        <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
          <button
            className="btn btn-ghost"
            style={{ padding: 0, fontWeight: 'normal', fontSize: 'var(--font-size-sm)' }}
            onClick={() => setFollowModal('followers')}
          >
            <strong style={{ color: 'var(--text-primary)' }}>{profile.followerCount ?? 0}</strong>&nbsp;
            <span style={{ color: 'var(--text-muted)' }}>Followers</span>
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: 0, fontWeight: 'normal', fontSize: 'var(--font-size-sm)' }}
            onClick={() => setFollowModal('following')}
          >
            <strong style={{ color: 'var(--text-primary)' }}>{profile.followingCount ?? 0}</strong>&nbsp;
            <span style={{ color: 'var(--text-muted)' }}>Following</span>
          </button>
        </div>

        {/* Follow button for non-own profiles */}
        {!isOwn && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <FollowButton
              targetUid={profile.uid}
              initialState={followState}
              onToggle={followed => {
                setFollowState(followed)
                setProfile(prev => ({
                  ...prev,
                  followerCount: (prev.followerCount ?? 0) + (followed ? 1 : -1)
                }))
              }}
              size="md"
            />
          </div>
        )}

        <div className="profile-meta-row">
          {profile.branch && profile.showBranch !== false && (
            <span className="profile-meta-item badge badge-brand">{profile.branch}</span>
          )}
          {profile.year && profile.showYear !== false && (
            <span className="profile-meta-item badge badge-green">{profile.year}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="divider" style={{ margin: '0 var(--space-5)' }} />

      {/* Posts tab header */}
      <div style={{ padding: 'var(--space-4) var(--space-5)', fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--brand-primary-dim)', borderBottom: '2px solid var(--brand-primary)' }}>
        Posts
      </div>

      {/* Posts */}
      {loadingPosts ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Icon name="pencil" size={40} /></div>
          <div className="empty-state-body">{isOwn ? "You haven't posted anything yet." : `@${username} hasn't posted yet.`}</div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              authorProfile={profile}
              isLiked={likeMap[post.id] ?? false}
              onDelete={handlePostDeleted}
            />
          ))}
          {hasMore && (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => fetchPosts(cursor)}>Load more</button>
            </div>
          )}
        </>
      )}

      {/* Edit Profile Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal-box animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="font-semibold">Edit Profile</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)} aria-label="Close"><Icon name="close" size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Banner upload */}
              <div className="form-group">
                <label className="form-label">Cover Banner</label>
                <label
                  htmlFor="edit-banner"
                  style={{
                    display: 'block', width: '100%', height: 100,
                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    cursor: 'pointer', position: 'relative',
                    background: editBannerPreview
                      ? `url(${editBannerPreview}) center/cover`
                      : 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
                    border: '1.5px dashed var(--border-normal)',
                  }}
                >
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)',
                    color: '#fff', fontSize: 'var(--font-size-xs)', gap: 6,
                  }}>
                    <Icon name="image" size={16} />
                    {editBannerPreview ? 'Change banner' : 'Upload banner image'}
                  </div>
                </label>
                <input id="edit-banner" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditBannerChange} />
              </div>

              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                <label htmlFor="edit-avatar" style={{ cursor: 'pointer', position: 'relative' }}>
                  <Avatar src={editAvatarPreview} name={profile.name} size="xl" />
                  <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--brand-primary)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)' }}>
                    <Icon name="pencil" size={12} />
                  </div>
                </label>
                <input id="edit-avatar" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditAvatarChange} />
                <span className="text-xs text-muted">Tap to change photo</span>
              </div>

              {/* Bio */}
              <div className="form-group">
                <label className="form-label" htmlFor="edit-bio">Bio</label>
                <textarea id="edit-bio" className="form-input form-textarea" value={editBio} onChange={e => setEditBio(e.target.value)} maxLength={160} rows={3} placeholder="Tell your batchmates about yourself…" />
                <span className="form-hint">{editBio.length}/160</span>
              </div>

              {/* Branch & Year */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-branch">Branch</label>
                  <select id="edit-branch" className="form-input form-select" value={editBranch} onChange={e => setEditBranch(e.target.value)}>
                    <option value="">None</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-year">Year</label>
                  <select id="edit-year" className="form-input form-select" value={editYear} onChange={e => setEditYear(e.target.value)}>
                    <option value="">None</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Academic Visibility */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span className="form-label" style={{ marginBottom: 2 }}>Academic Visibility</span>
                <label className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={editShowBranch}
                    onChange={e => setEditShowBranch(e.target.checked)}
                    style={{
                      accentColor: 'var(--brand-primary)',
                      width: 16, height: 16, cursor: 'pointer'
                    }}
                  />
                  Show Branch ({editBranch || 'None'}) on profile
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer', color: 'var(--text-primary)', marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={editShowYear}
                    onChange={e => setEditShowYear(e.target.checked)}
                    style={{
                      accentColor: 'var(--brand-primary)',
                      width: 16, height: 16, cursor: 'pointer'
                    }}
                  />
                  Show Year ({editYear || 'None'}) on profile
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button id="btn-cancel-edit" className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              <button id="btn-save-profile" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      {cropTarget && rawCropSrc && (
        <ImageCropModal
          imageSrc={rawCropSrc}
          aspect={cropTarget === 'avatar' ? 1 : 3}
          cropShape={cropTarget === 'avatar' ? 'round' : 'rect'}
          title={cropTarget === 'avatar' ? 'Crop Profile Photo' : 'Crop Cover Banner'}
          onCrop={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
      {/* Followers / Following modal */}
      {followModal && profile && (
        <FollowListModal
          uid={profile.uid}
          tab={followModal}
          onClose={() => setFollowModal(null)}
        />
      )}
    </div>
  )
}
