import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

const FAQ = [
  {
    q: 'How do I change my profile photo or bio?',
    a: 'Go to your Profile page and tap "Edit profile". You can update your photo, banner, bio, branch, and year.',
  },
  {
    q: 'How do voice calls work?',
    a: 'Calls use WebRTC — they\'re peer-to-peer and completely free. Both you and the other person need to allow microphone access. Best on Chrome or Edge.',
  },
  {
    q: 'My call isn\'t connecting / no audio',
    a: 'Check that your mic isn\'t blocked (click the lock icon in the address bar). If on campus Wi-Fi, try mobile data — some firewalls block WebRTC.',
  },
  {
    q: 'How do I delete a post?',
    a: 'Open the post and click the "···" menu, then choose "Delete". This is permanent.',
  },
  {
    q: 'What are Campus categories?',
    a: 'Campus has four sections: Doubts (ask questions), Notes (share study material), Hot (trending), and Collabs (find project partners).',
  },
  {
    q: 'How does the Leaderboard work?',
    a: 'It ranks users by weekly activity — posts, likes received, streak days, and follower growth. It resets every Monday.',
  },
  {
    q: 'How do I install Palzy as an app?',
    a: 'On Chrome, tap the "Install Palzy" banner when it appears, or go to browser menu → "Install app". On iOS Safari, tap Share → "Add to Home Screen".',
  },
  {
    q: 'Can I make my branch/year private?',
    a: 'Yes! In Edit Profile, uncheck "Show Branch on profile" or "Show Year on profile" to hide them.',
  },
  {
    q: 'How do I report a post?',
    a: 'Click the "···" menu on any post and select "Report". Choose a reason and submit. Our moderation team will review it.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Contact us at support@palzy.website with your username and registered email. We\'ll process the deletion within 48 hours.',
  },
]

export default function HelpPage() {
  const navigate = useNavigate()
  const [openIdx, setOpenIdx] = useState(null)

  return (
    <div className="feed-column">
      <div className="page-header">
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_left" size={20} />
        </button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="helpCircle" size={22} /> Help & FAQ
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
        {/* Contact box */}
        <div style={{
          padding: 'var(--space-4)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(108,99,255,0.08)',
          border: '1px solid var(--border-brand)',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}>
          <Icon name="send" size={20} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
              Need help?
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              Email us at <strong style={{ color: 'var(--text-brand)' }}>support@palzy.website</strong>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <h2 style={{
          fontSize: 'var(--font-size-base)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-4)',
          fontFamily: 'var(--font-display)',
        }}>
          Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {FAQ.map((item, i) => {
            const isOpen = openIdx === i
            return (
              <div
                key={i}
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  transition: 'border-color var(--dur-fast)',
                  borderColor: isOpen ? 'var(--border-brand)' : 'var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--space-4)',
                    background: isOpen ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    fontFamily: 'var(--font-display)',
                    transition: 'background var(--dur-fast)',
                  }}
                >
                  <span>{item.q}</span>
                  <Icon
                    name={isOpen ? 'close' : 'plus'}
                    size={14}
                  />
                </button>
                {isOpen && (
                  <div style={{
                    padding: 'var(--space-3) var(--space-4) var(--space-4)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.7,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
