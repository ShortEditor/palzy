import {
  doc, setDoc, updateDoc, onSnapshot,
  arrayUnion, collection, query, where,
} from 'firebase/firestore'
import { db } from './config'

/** Free public STUN servers — no account needed */
export const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

// ── Firestore document helpers (stored in open 'likes' collection) ───────────

function callDocRef(callId) {
  return doc(db, 'likes', `call_${callId}`)
}

export async function createCallDoc({
  callId, callerId, callerName, callerUsername, callerPhotoURL, callerIsVerified,
  calleeId, calleeName, calleeUsername, calleePhotoURL, calleeIsVerified,
}) {
  await setDoc(callDocRef(callId), {
    isCall: true,
    callId,
    callerId, callerName, callerUsername,
    callerPhotoURL: callerPhotoURL || '',
    callerIsVerified: callerIsVerified ?? false,
    calleeId, calleeName, calleeUsername,
    calleePhotoURL: calleePhotoURL || '',
    calleeIsVerified: calleeIsVerified ?? false,
    status: 'ringing', // ringing | active | declined | ended | missed
    offer: null,
    answer: null,
    callerIce: [],
    calleeIce: [],
    createdAt: Date.now(),
  })
}

export async function setCallOffer(callId, offer) {
  await updateDoc(callDocRef(callId), { offer })
}

export async function setCallAnswer(callId, answer) {
  await updateDoc(callDocRef(callId), { answer, status: 'active' })
}

export async function addCallerIce(callId, candidate) {
  await updateDoc(callDocRef(callId), {
    callerIce: arrayUnion(JSON.stringify(candidate)),
  })
}

export async function addCalleeIce(callId, candidate) {
  await updateDoc(callDocRef(callId), {
    calleeIce: arrayUnion(JSON.stringify(candidate)),
  })
}

export async function setCallStatus(callId, status) {
  await updateDoc(callDocRef(callId), { status })
}

/** Live listener for a specific call document */
export function listenToCall(callId, cb) {
  return onSnapshot(callDocRef(callId), snap => {
    if (snap.exists()) cb(snap.data())
  })
}

/**
 * Listen for incoming calls to a user.
 * Uses single-field `calleeId` query — auto-indexed, no composite index needed.
 */
export function listenForIncomingCalls(userId, cb) {
  const q = query(
    collection(db, 'likes'),
    where('calleeId', '==', userId),
  )
  return onSnapshot(q, snap => {
    const activeCalls = snap.docs
      .map(d => d.data())
      .filter(d => d.isCall && d.status === 'ringing')
    cb(activeCalls)
  })
}
