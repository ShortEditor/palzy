import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore'
import { db } from './config'

// The 5 emoji reactions (separate from the ❤️ like)
export const EMOJIS = ['😂', '🔥', '😮', '👏', '😢']
export const EMOJI_LABELS = {
  '😂': 'Haha',
  '🔥': 'Fire',
  '😮': 'Wow',
  '👏': 'Clap',
  '😢': 'Sad',
}

/**
 * Toggle an emoji reaction on a post.
 * - If user has no reaction → set to `emoji`, increment count
 * - If user has same emoji  → remove it, decrement count
 * - If user has diff emoji  → swap, adjust both counts
 * Returns the new emoji (string) or null (removed).
 */
export async function toggleEmojiReaction(postId, userId, emoji) {
  const reactionRef = doc(db, 'emojiReactions', `${postId}__${userId}`)
  const postRef     = doc(db, 'posts', postId)

  const existing = await getDoc(reactionRef)

  if (existing.exists()) {
    const oldEmoji = existing.data().emoji

    if (oldEmoji === emoji) {
      // Toggle off
      await deleteDoc(reactionRef)
      await updateDoc(postRef, { [`emojiCounts.${emoji}`]: increment(-1) })
      return null
    } else {
      // Swap emoji
      await setDoc(reactionRef, { postId, userId, emoji })
      await updateDoc(postRef, {
        [`emojiCounts.${oldEmoji}`]: increment(-1),
        [`emojiCounts.${emoji}`]:    increment(1),
      })
      return emoji
    }
  } else {
    // New reaction
    await setDoc(reactionRef, { postId, userId, emoji })
    await updateDoc(postRef, { [`emojiCounts.${emoji}`]: increment(1) })
    return emoji
  }
}

/** Get the user's current emoji reaction for a single post. */
export async function getUserEmojiReaction(postId, userId) {
  if (!postId || !userId) return null
  const snap = await getDoc(doc(db, 'emojiReactions', `${postId}__${userId}`))
  return snap.exists() ? snap.data().emoji : null
}

/** Batch-get emoji reactions for a list of posts. Returns { [postId]: emoji|null } */
export async function batchGetEmojiReactions(postIds, userId) {
  const result = {}
  postIds.forEach(id => { result[id] = null })
  if (!postIds.length || !userId) return result
  await Promise.all(
    postIds.map(postId =>
      getDoc(doc(db, 'emojiReactions', `${postId}__${userId}`))
        .then(snap => { if (snap.exists()) result[postId] = snap.data().emoji })
        .catch(() => {})
    )
  )
  return result
}
