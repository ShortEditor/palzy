import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import { getUserProfile } from './users'

export const STORY_GRADIENTS = [
  { id: 'neon',     name: 'Neon',     css: 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)' },
  { id: 'sunset',   name: 'Sunset',   css: 'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)' },
  { id: 'cyber',    name: 'Cyber',    css: 'linear-gradient(135deg, #FF007A 0%, #9600FF 100%)' },
  { id: 'ocean',    name: 'Ocean',    css: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
  { id: 'emerald',  name: 'Emerald',  css: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
  { id: 'midnight', name: 'Dark',     css: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { id: 'peach',    name: 'Peach',    css: 'linear-gradient(135deg, #FF8008 0%, #FFC837 100%)' },
]

export const STORY_FONTS = [
  { id: 'bold',   name: 'Bold',   family: 'var(--font-sans)', weight: 800, style: 'normal' },
  { id: 'serif',  name: 'Serif',  family: 'Playfair Display, Georgia, serif', weight: 700, style: 'italic' },
  { id: 'script', name: 'Script', family: 'Caveat, cursive, sans-serif', weight: 700, style: 'normal' },
  { id: 'code',   name: 'Mono',   family: 'JetBrains Mono, monospace', weight: 700, style: 'normal' },
]

/**
 * Create a new Text 24h Story (0 media storage cost).
 */
export async function createStory({ authorId, text = '', gradientId = 'neon', fontId = 'bold' }) {
  const author = await getUserProfile(authorId)
  const grad = STORY_GRADIENTS.find(g => g.id === gradientId)?.css || STORY_GRADIENTS[0].css
  const fontObj = STORY_FONTS.find(f => f.id === fontId) || STORY_FONTS[0]

  const docRef = await addDoc(collection(db, 'stories'), {
    authorId,
    authorName: author?.name || '',
    authorUsername: author?.username || '',
    authorPhotoURL: author?.photoURL || '',
    text: text.trim(),
    gradient: grad,
    gradientId,
    fontFamily: fontObj.family,
    fontWeight: fontObj.weight,
    fontStyle: fontObj.style || 'normal',
    fontId,
    createdAt: serverTimestamp(),
  })

  return docRef.id
}

/**
 * Delete a story (own story).
 */
export async function deleteStory(storyId) {
  await deleteDoc(doc(db, 'stories', storyId))
}

/**
 * Fetch active text stories (posted in the last 24 hours).
 */
export async function getActiveStories(currentUid, followingIds = []) {
  if (!currentUid) return []

  const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const uidsToFetch = [...new Set([currentUid, ...followingIds])].slice(0, 30)

  if (uidsToFetch.length === 0) return []

  try {
    const q = query(
      collection(db, 'stories'),
      where('authorId', 'in', uidsToFetch),
      where('createdAt', '>=', twentyFourHoursAgo),
      orderBy('createdAt', 'desc')
    )

    const snap = await getDocs(q)
    const rawStories = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Group stories by authorId
    const groupsMap = {}
    rawStories.forEach(story => {
      const aid = story.authorId
      if (!groupsMap[aid]) {
        groupsMap[aid] = {
          authorId: aid,
          authorName: story.authorName,
          authorUsername: story.authorUsername,
          authorPhotoURL: story.authorPhotoURL,
          stories: [],
        }
      }
      groupsMap[aid].stories.push(story)
    })

    // Sort: current user's group first, then recent updates
    const groups = Object.values(groupsMap)
    groups.sort((a, b) => {
      if (a.authorId === currentUid) return -1
      if (b.authorId === currentUid) return 1
      const aLatest = a.stories[0]?.createdAt?.toMillis?.() || 0
      const bLatest = b.stories[0]?.createdAt?.toMillis?.() || 0
      return bLatest - aLatest
    })

    return groups
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.error('getActiveStories error:', err)
    }
    return []
  }
}
