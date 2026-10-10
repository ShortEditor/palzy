import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { useTheme } from '../contexts/ThemeContext'
import './LandingPage.css'

const features = [
  { icon: 'users', title: 'Find your campus crowd', text: 'Follow classmates, share moments and keep up with the people around you.' },
  { icon: 'document', title: 'Notes, doubts, collabs', text: 'A campus board for sharing notes, asking questions and finding people to work with.' },
  { icon: 'heart', title: 'Make it your vibe', text: 'Post photos, text and quote cards. React, comment and share your day through stories.' },
]
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Link to="/welcome" className="landing-logo" aria-label="Palzy home"><img src="/icon-192.png" alt="" />Palzy</Link>
        <nav aria-label="Main navigation">
          <a href="#what-is-palzy" className="landing-about-link">What is Palzy?</a>
          <button className="btn btn-ghost" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} /></button>
          <Link className="btn btn-primary" to="/login">Log in</Link>
        </nav>
      </header>
      <main>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow">YOUR CAMPUS. YOUR VIBE.</span>
            <h1 id="landing-title">College life,<br /><span>all together.</span></h1>
            <p>Palzy is a campus social space for students. Meet your crowd, share what matters and help each other along the way.</p>
            <div className="landing-actions"><Link className="btn btn-primary btn-lg" to="/login">Join your campus <Icon name="arrowRight" size={18} /></Link><a className="btn btn-ghost" href="#what-is-palzy">Take a look</a></div>
            <p className="landing-fine-print">Just looking? You can learn about Palzy here without an account.</p>
          </div>
          <div className="landing-preview" aria-label="Illustrative campus board preview">
            <span className="landing-preview-label">A little campus energy</span>
            <div className="landing-demo-card landing-demo-note"><span className="landing-chip"><Icon name="document" size={15} /> Notes</span><h2>That topic finally clicked.</h2><p>Share a useful explanation with your classmates.</p><div className="landing-demo-footer"><Icon name="heart" size={17} /><Icon name="comment" size={17} /><span>Learn together</span></div></div>
            <div className="landing-demo-card landing-demo-collab"><span className="landing-chip"><Icon name="handshake" size={15} /> Collab</span><h2>A good idea needs a team.</h2><p>Find people to build something with.</p></div>
            <span className="landing-demo-caption">Illustration of Palzy features, not real student posts.</span>
          </div>
        </section>
        <section id="what-is-palzy" className="landing-features" aria-labelledby="landing-features-title">
          <span className="landing-eyebrow">MADE FOR CAMPUS LIFE</span><h2 id="landing-features-title">More than another group chat.</h2>
          <div className="landing-feature-grid">{features.map(feature => <article key={feature.title} className="landing-feature"><div className="landing-feature-icon"><Icon name={feature.icon} size={25} /></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
        </section>
        <section className="landing-staff"><div><span className="landing-eyebrow">SHOW SOMEONE AROUND</span><h2>A quick introduction, no sign-in needed.</h2><p>For staff, classmates or anyone curious: Palzy brings student posts, campus discussions and peer connections into one place. This public page explains the app. Member feeds and profiles still require sign-in.</p></div><Link to="/login" className="btn btn-primary btn-lg">Explore as a member</Link></section>
      </main>
      <footer className="landing-footer"><span>Palzy · Connect with your crowd.</span><nav aria-label="Legal links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/login">Log in / Register</Link></nav></footer>
    </div>
  )
}
