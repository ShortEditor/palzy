import { useState, useEffect, useCallback } from 'react'
import { getReports, dismissReport, resolveReport } from '../../firebase/admin'
import { getUserProfile } from '../../firebase/users'
import { getPost } from '../../firebase/posts'
import { formatDistanceToNow } from 'date-fns'
import Avatar from '../../components/Avatar'
import toast from 'react-hot-toast'

const REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'Misinformation', 'Other']

export default function AdminReports() {
  const [reports, setReports]     = useState([])
  const [postMap, setPostMap]     = useState({})    // postId → post
  const [authorMap, setAuthorMap] = useState({})    // uid → profile
  const [cursor, setCursor]       = useState(null)
  const [hasMore, setHasMore]     = useState(true)
  const [loading, setLoading]     = useState(true)
  const [actionId, setActionId]   = useState(null)
  const [filter, setFilter]       = useState('pending') // 'pending' | 'all'

  const fetchReports = useCallback(async (cur = null) => {
    setLoading(true)
    try {
      const { reports: newReports, nextCursor, hasMore: more } = await getReports(cur)

      // Load posts and reporter profiles
      const missingPostIds = [...new Set(newReports.map(r => r.postId))].filter(id => !postMap[id])
      const missingUids    = [...new Set(newReports.map(r => r.reportedBy))].filter(uid => !authorMap[uid])

      const [posts, profiles] = await Promise.all([
        Promise.all(missingPostIds.map(id => getPost(id))),
        Promise.all(missingUids.map(uid => getUserProfile(uid))),
      ])

      const newPostMap = {}
      posts.forEach((p, i) => { if (p) newPostMap[missingPostIds[i]] = p })
      const newAuthorMap = {}
      profiles.forEach((p, i) => { if (p) newAuthorMap[missingUids[i]] = p })

      setPostMap(prev => ({ ...prev, ...newPostMap }))
      setAuthorMap(prev => ({ ...prev, ...newAuthorMap }))
      setReports(prev => cur ? [...prev, ...newReports] : newReports)
      setCursor(nextCursor)
      setHasMore(more)
    } catch (err) {
      toast.error('Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }, [postMap, authorMap])

  useEffect(() => { fetchReports() }, []) // eslint-disable-line

  async function handleDismiss(reportId) {
    setActionId(reportId)
    try {
      await dismissReport(reportId)
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r))
      toast.success('Report dismissed.')
    } catch {
      toast.error('Action failed.')
    } finally {
      setActionId(null)
    }
  }

  async function handleResolve(reportId, postId) {
    if (!window.confirm('Delete this post and resolve the report?')) return
    setActionId(reportId)
    try {
      await resolveReport(reportId, postId)
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r))
      setPostMap(prev => { const n = { ...prev }; delete n[postId]; return n })
      toast.success('Post deleted and report resolved.')
    } catch {
      toast.error('Action failed.')
    } finally {
      setActionId(null)
    }
  }

  const filtered = filter === 'pending'
    ? reports.filter(r => r.status === 'pending')
    : reports

  return (
    <div style={{ padding: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>Reports</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {reports.filter(r => r.status === 'pending').length} pending reports
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['pending', 'all'].map(f => (
            <button
              key={f}
              id={`admin-reports-filter-${f}`}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f === 'pending' ? '🚩 Pending' : '📋 All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}><div className="spinner spinner-lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">All clear!</div>
          <div className="empty-state-body">No {filter === 'pending' ? 'pending' : ''} reports right now.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filtered.map(report => {
            const reporter = authorMap[report.reportedBy]
            const post     = postMap[report.postId]
            const time     = report.createdAt?.toDate?.()
            const isPending = report.status === 'pending'

            return (
              <div
                key={report.id}
                className="card"
                style={{ padding: 'var(--space-5)', opacity: isPending ? 1 : 0.6, borderColor: isPending ? 'var(--border-normal)' : 'var(--border-subtle)' }}
              >
                {/* Status badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {report.status === 'pending'   && <span className="badge badge-red">🚩 Pending</span>}
                    {report.status === 'dismissed' && <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Dismissed</span>}
                    {report.status === 'resolved'  && <span className="badge badge-green">✅ Resolved</span>}
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      Reason: <strong style={{ color: 'var(--text-secondary)' }}>{report.reason}</strong>
                    </span>
                  </div>
                  {time && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{formatDistanceToNow(time, { addSuffix: true })}</span>}
                </div>

                {/* Reporter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  <Avatar src={reporter?.photoURL} name={reporter?.name} size="sm" />
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Reported by <strong style={{ color: 'var(--text-primary)' }}>@{reporter?.username ?? '...'}</strong>
                  </span>
                </div>

                {/* Reported post preview */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)', borderLeft: '3px solid var(--brand-red)' }}>
                  {post ? (
                    <>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Post ID: {post.id}</div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {post.content || <em style={{ color: 'var(--text-muted)' }}>[image post]</em>}
                      </p>
                      {post.imageURL && <img src={post.imageURL} alt="reported" style={{ maxHeight: 100, borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-2)', objectFit: 'cover' }} />}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>Post already deleted.</span>
                  )}
                </div>

                {/* Actions */}
                {isPending && (
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                      id={`admin-btn-dismiss-${report.id}`}
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDismiss(report.id)}
                      disabled={actionId === report.id}
                    >
                      {actionId === report.id ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : '👍 Dismiss'}
                    </button>
                    {post && (
                      <button
                        id={`admin-btn-resolve-${report.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => handleResolve(report.id, report.postId)}
                        disabled={actionId === report.id}
                      >
                        🗑️ Delete post &amp; Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasMore && !loading && (
        <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button className="btn btn-outline" onClick={() => fetchReports(cursor)}>Load more</button>
        </div>
      )}
    </div>
  )
}
