import { doc, getDoc, runTransaction, increment } from 'firebase/firestore'
import { db } from './config'
import { getUserProfile } from './users'
import { createNotification } from './notifications'

export const EMOJIS = ['😂', '🔥', '😮', '👏', '😢']
export const EMOJI_LABELS = {
  '😂': 'Haha', '🔥': 'Fire', '😮': 'Wow', '👏': 'Clap', '😢': 'Sad',
}
/** Maps emoji data-keys → Icon component names for SVG rendering */
export const EMOJI_ICON_MAP = {
  '😂': 'emojiLaugh', '🔥': 'fire', '😮': 'emojiWow', '👏': 'emojiClap', '😢': 'emojiSad',
}


// ── Storage layout (inside the already-open 'likes' collection) ──────────────
// User reaction : likes/{postId}_rxn_{userId}  →  { postId, userId, emoji }
// Aggregate     : likes/{postId}_emojiCounts   →  { '😂': 3, '🔥': 1, … }
// This avoids needing new Firestore rules for a separate collection.

const rxnRef  = (postId, userId) => doc(db, 'likes', `${postId}_rxn_${userId}`)
const cntRef  = (postId)         => doc(db, 'likes', `${postId}_emojiCounts`)

/**
 * Toggle an emoji reaction (atomic transaction).
 * Returns the new emoji or null (removed).
 */
export async function toggleEmojiReaction(postId, userId, emoji) {
  const rxnDoc = rxnRef(postId, userId)
  const cntDoc = cntRef(postId)

  const result = await runTransaction(db, async (tx) => {
    const [existingSnap, cntSnap] = await Promise.all([
      tx.get(rxnDoc),
      tx.get(cntDoc),
    ])

    if (existingSnap.exists()) {
      const old = existingSnap.data().emoji

      if (old === emoji) {
        // Toggle off — remove reaction and decrement count
        tx.delete(rxnDoc)
        if (cntSnap.exists()) {
          tx.update(cntDoc, { [old]: increment(-1) })
        }
        return null
      } else {
        // Swap emoji — update reaction doc, decrement old, increment new
        tx.set(rxnDoc, { postId, userId, emoji })
        if (cntSnap.exists()) {
          tx.update(cntDoc, { [old]: increment(-1), [emoji]: increment(1) })
        } else {
          tx.set(cntDoc, { [emoji]: 1 })
        }
        return emoji
      }
    } else {
      // New reaction — create reaction doc and increment count
      tx.set(rxnDoc, { postId, userId, emoji })
      if (cntSnap.exists()) {
        tx.update(cntDoc, { [emoji]: increment(1) })
      } else {
        tx.set(cntDoc, { [emoji]: 1 })
      }
      return emoji
    }
  })

  // Notify post author if a reaction was set (fire-and-forget, outside transaction)
  if (result) {
    getDoc(doc(db, 'posts', postId))
      .then(pSnap => {
        const postData = pSnap.data()
        if (postData?.authorId && postData.authorId !== userId) {
          getUserProfile(userId)
            .then(reactor => {
              createNotification(postData.authorId, {
                type: 'reaction',
                fromUid: userId,
                fromName: reactor?.name || 'Someone',
                fromUsername: reactor?.username || '',
                fromPhotoURL: reactor?.photoURL || '',
                postId,
                postContent: postData.content || '',
                emoji: result,
              })
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  }

  return result
}

/** Get aggregate emoji counts for a post. */
export async function getEmojiCounts(postId) {
  if (!postId) return {}
  try {
    const snap = await getDoc(cntRef(postId))
    return snap.exists() ? snap.data() : {}
  } catch { return {} }
}

/** Get the current user's emoji reaction for a post. */
export async function getUserEmojiReaction(postId, userId) {
  if (!postId || !userId) return null
  try {
    const snap = await getDoc(rxnRef(postId, userId))
    return snap.exists() ? snap.data().emoji : null
  } catch { return null }
}

/** Batch-get user's reactions for a list of posts. Returns { [postId]: emoji|null } */
export async function batchGetEmojiReactions(postIds, userId) {
  const result = {}
  postIds.forEach(id => { result[id] = null })
  if (!postIds.length || !userId) return result
  await Promise.all(
    postIds.map(postId =>
      getDoc(rxnRef(postId, userId))
        .then(snap => { if (snap.exists()) result[postId] = snap.data().emoji })
        .catch(() => {})
    )
  )
  return result
}
