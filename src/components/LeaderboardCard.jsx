import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { getWeeklyLeaderboard } from "../firebase/leaderboard"
import Avatar from "./Avatar"

const MEDAL = ["🥇", "🥈", "🥉"]

export default function LeaderboardCard() {
  const { userProfile } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile) return
    getWeeklyLeaderboard(userProfile.branch, userProfile.year, 5)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userProfile])

  if (loading) return (
    <div className="suggestions-sidebar-card" style={{ padding: "var(--space-5)" }}>
      <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 6, marginBottom: "var(--space-3)" }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
          <div className="skeleton" style={{ height: 12, width: "60%", borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )

  if (!entries.length) return null

  return (
    <div className="suggestions-sidebar-card" style={{ padding: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
        <span style={{ fontSize: 18 }}>🏆</span>
        <span style={{ fontFamily: "var(--font-fun)", fontWeight: 700, fontSize: "var(--font-size-sm)", color: "var(--text-primary)" }}>
          Top Posters This Week
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {entries.map((entry, i) => (
          <Link
            key={entry.uid}
            to={`/u/${entry.username}`}
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "var(--space-3)" }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>
              {MEDAL[i] ?? `#${i + 1}`}
            </span>
            <Avatar src={entry.photoURL} name={entry.name} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                fontSize: "var(--font-size-sm)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {entry.name}
              </div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                {entry.postCount} post{entry.postCount !== 1 ? "s" : ""}
              </div>
            </div>
            {i === 0 && (
              <span style={{
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 99,
                flexShrink: 0,
              }}>LEADER</span>
            )}
          </Link>
        ))}
      </div>

      <div style={{
        marginTop: "var(--space-3)",
        paddingTop: "var(--space-3)",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: "var(--font-size-xs)",
        color: "var(--text-muted)",
        textAlign: "center",
      }}>
        Resets every Monday
      </div>
    </div>
  )
}
