import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="feed-column">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="shield" size={22} /> Privacy Policy
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
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-4)' }}>
          Last updated: September 2026
        </p>

        <Section title="What We Collect">
          <ul>
            <li><strong>Account info</strong> — your name, email, profile photo, branch, and year when you sign up.</li>
            <li><strong>Content</strong> — posts, comments, reactions, stories, and quote cards you create.</li>
            <li><strong>Usage data</strong> — interactions like follows, likes, and call metadata (never recorded audio).</li>
          </ul>
        </Section>

        <Section title="How We Use It">
          <ul>
            <li>To provide and personalise your Palzy experience (feed, recommendations, campus features).</li>
            <li>To show relevant suggestions — users from the same branch or with mutual friends.</li>
            <li>To send notifications about activity on your content.</li>
            <li>To enforce community guidelines via our moderation tools.</li>
          </ul>
        </Section>

        <Section title="What We Don't Do">
          <ul>
            <li>We <strong>never sell</strong> your data to advertisers or third parties.</li>
            <li>We don't read or record your voice calls — they're peer-to-peer via WebRTC.</li>
            <li>We don't share your email with other users unless you choose to make it visible.</li>
          </ul>
        </Section>

        <Section title="Data Storage">
          <p>
            Your data is stored securely on Google Firebase (Firestore, Firebase Auth, Firebase Storage).
            Profile photos and post images are hosted on Cloudinary's CDN. All data remains within
            services that comply with industry-standard security practices.
          </p>
        </Section>

        <Section title="Your Rights">
          <ul>
            <li>You can edit or delete your profile information at any time.</li>
            <li>You can delete your own posts and comments.</li>
            <li>You can contact us to request full account deletion.</li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            For privacy-related questions, reach out to the Palzy team through the Help page or
            email us at <strong style={{ color: 'var(--text-brand)' }}>support@palzy.website</strong>.
          </p>
        </Section>
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
