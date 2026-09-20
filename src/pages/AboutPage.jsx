import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <div className="feed-column">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={22} /> About Palzy
        </h1>
      </div>

      <div style={{
        padding: 'var(--space-5)',
        margin: 'var(--space-4)',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-clay)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-secondary)',
        lineHeight: 1.8,
      }}>
        {/* Logo + tagline */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <img
            src="/logo-header.png"
            alt="Palzy"
            style={{ height: 48, margin: '0 auto var(--space-3)', objectFit: 'contain' }}
          />
          <div style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 800,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            Palzy — Your Campus Social Network
          </div>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            Built by students, for students. A place to connect with your batchmates, share ideas,
            and stay updated with what's happening on campus.
          </p>
        </div>

        <Section title="What is Palzy?">
          <p>
            Palzy is a social media platform designed specifically for college communities.
            It combines features you love from mainstream social platforms with tools tailored
            for academic life — campus categories (Doubts, Notes, Collabs), voice calls,
            weekly recap cards, and a leaderboard to celebrate your most active peers.
          </p>
        </Section>

        <Section title="Features">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            {[
              { icon: 'comment', label: 'Posts & Stories', desc: 'Share text, images, and 24-hour stories' },
              { icon: 'book', label: 'Campus', desc: 'Doubts, Notes, Hot Topics & Collabs' },
              { icon: 'phone', label: 'Voice Calls', desc: 'Free peer-to-peer WebRTC calls' },
              { icon: 'trophy', label: 'Leaderboard', desc: 'See who\'s most active this week' },
              { icon: 'sparkles', label: 'Quote Cards', desc: 'Create beautiful shareable cards' },
              { icon: 'chart', label: 'Weekly Recap', desc: 'Download your activity summary' },
            ].map(f => (
              <div key={f.label} style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name={f.icon} size={15} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-xs)' }}>{f.label}</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{f.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Tech Stack">
          <p>
            React + Vite, Firebase (Auth, Firestore, Storage), Cloudinary for media,
            WebRTC for voice calls, deployed as a PWA on Vercel.
          </p>
        </Section>

        <Section title="Open Source & Credits">
          <p>
            Palzy is a student-built project. Built with care at college, using open-source
            tools and libraries. Icons are custom inline SVGs. Fonts: Inter and Baloo 2.
          </p>
        </Section>

        <div style={{
          textAlign: 'center',
          padding: 'var(--space-4)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: 'var(--space-4)',
        }}>
          © 2026 Palzy · Made for college · v1.0
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <h2 style={{
        fontSize: 'var(--font-size-base)',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-2)',
        fontFamily: 'var(--font-display)',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
