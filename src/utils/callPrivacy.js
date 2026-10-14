// Missing preferences use the same default for new and existing accounts.
export const DEFAULT_CALL_PRIVACY = 'following'
export const CALL_PRIVACY_OPTIONS = [
  { value: 'none', label: 'No one' },
  { value: 'following', label: 'Only people I follow' },
  { value: 'everyone', label: 'Everyone' },
]
export const CALL_BLOCKED_MESSAGE = "This user isn't accepting calls from you."

export function normalizeCallPrivacy(value) {
  return CALL_PRIVACY_OPTIONS.some(option => option.value === value)
    ? value : DEFAULT_CALL_PRIVACY
}

export function allowsCall(preference, recipientFollowsCaller) {
  const setting = normalizeCallPrivacy(preference)
  return setting === 'everyone' || (setting === 'following' && recipientFollowsCaller === true)
}

// Read the recipient's preference and follow direction fresh, never from a
// profile card or the five-minute display-profile cache. Errors fail closed.
export async function checkCallPermission(callerId, calleeId, { readUser, readFollow }) {
  if (!callerId || !calleeId || callerId === calleeId) return false
  const recipient = await readUser(calleeId)
  if (!recipient) return false
  const preference = normalizeCallPrivacy(recipient.callPrivacy)
  if (preference !== 'following') return allowsCall(preference, false)
  return allowsCall(preference, await readFollow(calleeId, callerId))
}
