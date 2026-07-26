import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore'
import { db } from './config'

export const EMOJIS = ['😂', '🔥', '😮', '👏', '😢']
export const EMOJI_LABELS = {
  '😂': 'Haha', '🔥': 'Fire', '😮': 'Wow', '👏': 'Clap', '😢': 'Sad',
}

// ── Storage layout (inside the already-open 'likes' collection) ──────────────
// User reaction : likes/{postId}_rxn_{userId}  →  { postId, userId, emoji }
// Aggregate     : likes/{postId}_emojiCounts   →  { '😂': 3, '🔥': 1, … }
// This avoids needing new Firestore rules for a separate collection.

const rxnRef  = (postId, userId) => doc(db, 'likes', `${postId}_rxn_${userId}`)
const cntRef  = (postId)         => doc(db, 'likes', `${postId}_emojiCounts`)

/**
 * Toggle an emoji reaction. Returns the new emoji or null (removed).
 */
export async function toggleEmojiReaction(postId, userId, emoji) {
  const rxnDoc = rxnRef(postId, userId)
  const cntDoc = cntRef(postId)

  const existing = await getDoc(rxnDoc)

  if (existing.exists()) {
    const old = existing.data().emoji

    if (old === emoji) {
      // Toggle off
      await deleteDoc(rxnDoc)
      try { await updateDoc(cntDoc, { [old]: increment(-1) }) } catch { /* counts doc may not exist */ }
      return null
    } else {
      // Swap emoji
      await setDoc(rxnDoc, { postId, userId, emoji })
      try {
        await updateDoc(cntDoc, { [old]: increment(-1), [emoji]: increment(1) })
      } catch {
        await setDoc(cntDoc, { [emoji]: 1 })
      }
      return emoji
    }
  } else {
    // New reaction
    await setDoc(rxnDoc, { postId, userId, emoji })
    const cntSnap = await getDoc(cntDoc)
    if (cntSnap.exists()) {
      await updateDoc(cntDoc, { [emoji]: increment(1) })
    } else {
      await setDoc(cntDoc, { [emoji]: 1 })
    }
    return emoji
  }
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
