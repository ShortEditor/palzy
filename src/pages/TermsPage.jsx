import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="feed-column">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="fileText" size={22} /> Terms of Service
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

        <Section title="Acceptance">
          <p>
            By creating an account or using Palzy, you agree to these terms. If you don't agree,
            please don't use the platform.
          </p>
        </Section>

        <Section title="Eligibility">
          <ul>
            <li>Palzy is designed for college students. You must be at least 16 years old.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
          </ul>
        </Section>

        <Section title="Your Content">
          <ul>
            <li>You own the content you post (text, images, quote cards, stories).</li>
            <li>By posting, you grant Palzy a non-exclusive licence to display and distribute your content within the platform.</li>
            <li>You can delete your content at any time.</li>
          </ul>
        </Section>

        <Section title="Community Rules">
          <ul>
            <li><strong>No harassment</strong> — Don't bully, threaten, or target anyone.</li>
            <li><strong>No spam</strong> — Don't flood feeds with repetitive or irrelevant content.</li>
            <li><strong>No impersonation</strong> — Use your real identity; don't pretend to be someone else.</li>
            <li><strong>No illegal content</strong> — Don't post anything that violates applicable laws.</li>
            <li><strong>No NSFW</strong> — Keep content appropriate for a college community.</li>
          </ul>
          <p style={{ marginTop: 'var(--space-2)' }}>
            Violations may result in content removal, account suspension, or permanent ban at our discretion.
          </p>
        </Section>

        <Section title="Voice Calls">
          <p>
            Calls are peer-to-peer via WebRTC. We don't record or listen to calls.
            Both parties must consent to the call — do not misuse the calling feature.
          </p>
        </Section>

        <Section title="Modifications">
          <p>
            We may update these terms from time to time. Continued use of Palzy after changes
            constitutes acceptance. We'll notify users of significant changes through the platform.
          </p>
        </Section>

        <Section title="Disclaimer">
          <p>
            Palzy is a student project. The service is provided "as is" without warranties.
            We do our best to keep things running smoothly, but can't guarantee 100% uptime.
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
