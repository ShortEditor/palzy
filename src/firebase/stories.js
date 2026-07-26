import { doc, getDoc, updateDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { db } from './config'
import { invalidateUserCache } from './users'

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

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

/**
 * Create a new Text 24h Story.
 */
export async function createStory({ authorId, text = '', gradientId = 'neon', fontId = 'bold' }) {
  const userRef = doc(db, 'users', authorId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) throw new Error('User profile does not exist')

  const profile = snap.data()
  const currentStories = Array.isArray(profile.stories) ? profile.stories : []

  // Filter out any expired stories
  const now = Date.now()
  const activeStories = currentStories.filter(s => {
    const time = s.createdAt || 0
    return now - time < TWENTY_FOUR_HOURS
  })

  const grad = STORY_GRADIENTS.find(g => g.id === gradientId)?.css || STORY_GRADIENTS[0].css
  const fontObj = STORY_FONTS.find(f => f.id === fontId) || STORY_FONTS[0]

  const newStory = {
    id: `story_${authorId}_${now}`,
    authorId,
    authorName: profile.name || '',
    authorUsername: profile.username || '',
    authorPhotoURL: profile.photoURL || '',
    authorIsVerified: profile.isVerified ?? false,
    text: text.trim(),
    gradient: grad,
    gradientId,
    fontFamily: fontObj.family,
    fontWeight: fontObj.weight,
    fontStyle: fontObj.style || 'normal',
    fontId,
    createdAt: now,
  }

  // Prepend to array
  const updatedStories = [newStory, ...activeStories]

  await updateDoc(userRef, { stories: updatedStories })
  invalidateUserCache(authorId)

  return newStory.id
}

/**
 * Delete a story (own story).
 */
export async function deleteStory(storyId, authorId) {
  const userRef = doc(db, 'users', authorId)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return

  const profile = snap.data()
  const currentStories = Array.isArray(profile.stories) ? profile.stories : []

  // Filter out the deleted story
  const updatedStories = currentStories.filter(s => s.id !== storyId)

  await updateDoc(userRef, { stories: updatedStories })
  invalidateUserCache(authorId)
}

/**
 * Fetch active text stories (posted in the last 24 hours) from followed users + self.
 */
export async function getActiveStories(currentUid, followingIds = []) {
  if (!currentUid) return []

  const uidsToFetch = [...new Set([currentUid, ...followingIds])].slice(0, 30)
  const now = Date.now()

  try {
    // Fetch all profiles in parallel
    const snaps = await Promise.all(
      uidsToFetch.map(uid => getDoc(doc(db, 'users', uid)))
    )

    const rawStories = []
    snaps.forEach(snap => {
      if (snap.exists()) {
        const profile = snap.data()
        const userStories = Array.isArray(profile.stories) ? profile.stories : []

        // Filter active stories
        const activeStories = userStories.filter(s => {
          const time = s.createdAt || 0
          return now - time < TWENTY_FOUR_HOURS
        })

        if (activeStories.length > 0) {
          rawStories.push({
            authorId: snap.id,
            authorName: profile.name || '',
            authorUsername: profile.username || '',
            authorPhotoURL: profile.photoURL || '',
            authorIsVerified: profile.isVerified ?? false,
            stories: activeStories,
          })
        }
      }
    })

    // Sort: current user's group first, then recent updates based on the latest story
    rawStories.sort((a, b) => {
      if (a.authorId === currentUid) return -1
      if (b.authorId === currentUid) return 1
      const aLatest = a.stories[0]?.createdAt || 0
      const bLatest = b.stories[0]?.createdAt || 0
      return bLatest - aLatest
    })

    return rawStories
  } catch (err) {
    console.error('getActiveStories error:', err)
    return []
  }
}

/**
 * Record a story view inside the open 'likes' collection (bypassing rules/indexes).
 */
export async function markStoryAsViewed(storyId, viewerId, viewerProfile) {
  if (!storyId || !viewerId || !viewerProfile) return
  const viewId = `storyview_${storyId}_${viewerId}`
  try {
    await setDoc(doc(db, 'likes', viewId), {
      isStoryView: true,
      storyId,
      viewerId,
      viewerName: viewerProfile.name || '',
      viewerUsername: viewerProfile.username || '',
      viewerPhotoURL: viewerProfile.photoURL || '',
      createdAt: Date.now(),
    })
  } catch (err) {
    console.error('Error marking story as viewed:', err)
  }
}

/**
 * Fetch all viewers for a specific story (using a single-field query on storyId).
 */
export async function getStoryViewers(storyId) {
  if (!storyId) return []
  try {
    const q = query(
      collection(db, 'likes'),
      where('storyId', '==', storyId)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching story viewers:', err)
    return []
  }
}
