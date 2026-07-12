import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { db } from "./config"
import { getUserProfile } from "./users"

// Weekly class leaderboard
// Returns top `count` posters from the same branch+year this week.
// Week starts Monday 00:00 local time.
export async function getWeeklyLeaderboard(branch, year, count = 5) {
  const now = new Date()
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const startTs = Timestamp.fromDate(weekStart)

  const snap = await getDocs(query(
    collection(db, "posts"),
    where("createdAt", ">=", startTs),
  ))

  const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }))

  // Count posts per author
  const counts = {}
  posts.forEach(p => {
    counts[p.authorId] = (counts[p.authorId] ?? 0) + 1
  })

  // Sort by count desc
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count * 3)

  const profiles = await Promise.all(sorted.map(([uid]) => getUserProfile(uid)))

  const results = []
  for (let i = 0; i < sorted.length; i++) {
    const [uid, postCount] = sorted[i]
    const profile = profiles[i]
    if (!profile) continue
    if (branch && profile.branch && profile.branch !== branch) continue
    if (year && profile.year && profile.year !== year) continue
    results.push({ uid, postCount, ...profile })
    if (results.length >= count) break
  }

  return results
}
