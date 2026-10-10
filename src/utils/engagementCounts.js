export const REACTION_EMOJIS = ['😂', '🔥', '😮', '👏', '😢']
export function engagementCounts(postId, records) {
  let likeCount = 0
  const emojiCounts = {}
  for (const record of records) {
    if (record.postId !== postId || typeof record.userId !== 'string' || !record.userId) continue
    if (record.isNotification || record.isCall || record.isStoryView) continue
    if (record.id === `${postId}_${record.userId}` && !record.emoji) likeCount++
    if (record.id === `${postId}_rxn_${record.userId}` && REACTION_EMOJIS.includes(record.emoji)) {
      emojiCounts[record.emoji] = (emojiCounts[record.emoji] || 0) + 1
    }
  }
  return { likeCount, emojiCounts }
}
