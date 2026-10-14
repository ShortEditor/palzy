import { invalidatePostCounts } from './counts'
import { doc, getDoc, runTransaction, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './config'
import { getUserProfile } from './users'
import { createNotification } from './notifications'

import { REACTION_EMOJIS, engagementCounts } from '../utils/engagementCounts'
export const EMOJIS = REACTION_EMOJIS
export const EMOJI_LABELS = {
  '😂': 'Haha', '🔥': 'Fire', '😮': 'Wow', '👏': 'Clap', '😢': 'Sad',
}
/** Maps emoji data-keys → Icon component names for SVG rendering */
export const EMOJI_ICON_MAP = {
  '😂': 'emojiLaugh', '🔥': 'fire', '😮': 'emojiWow', '👏': 'emojiClap', '😢': 'emojiSad',
}


// ── Storage layout (inside the already-open 'likes' collection) ──────────────
// User reaction : likes/{postId}_rxn_{userId}  →  { postId, userId, emoji }
// Counts are derived from individual reactions; old aggregate documents are ignored.

const rxnRef  = (postId, userId) => doc(db, 'likes', `${postId}_rxn_${userId}`)

/**
 * Toggle an emoji reaction (atomic transaction).
 * Returns the new emoji or null (removed).
 */
export async function toggleEmojiReaction(postId, userId, emoji) {
  const rxnDoc = rxnRef(postId, userId)
  if (!EMOJIS.includes(emoji)) throw new Error('Invalid reaction')
  invalidatePostCounts(postId)
  const result = await runTransaction(db, async tx => {
    const existing = await tx.get(rxnDoc)
    if (existing.exists() && existing.data().emoji === emoji) {
      tx.delete(rxnDoc)
      return null
    }
    tx.set(rxnDoc, { postId, userId, emoji })
    return emoji
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
  const snap = await getDocs(query(collection(db, 'likes'), where('postId', '==', postId)))
  return engagementCounts(postId, snap.docs.map(d => ({ id: d.id, ...d.data() }))).emojiCounts
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
