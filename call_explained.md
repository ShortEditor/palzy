# 📞 How Palzy's WebRTC Voice Call Feature Works

This document explains, in detail, how the voice call feature works under the hood — how WebRTC establishes a peer-to-peer audio connection between two students, how Firebase Firestore is cleverly reused as the "signaling server," and exactly which resources each piece uses.

---

## 🧠 Big Picture: The Two Phases of a Call

A WebRTC call happens in **two distinct phases**:

| Phase | What travels | Where it goes | Who carries it |
|-------|--------------|---------------|----------------|
| **1. Signaling** | "Hello, I'm here, here's how to reach me" | Firestore (`likes` collection) | Firebase (your backend) |
| **2. The Call itself** | Live audio data | Directly between the two browsers (P2P) | WebRTC over the open internet |

> 💡 The key insight: **Firebase is only used for phase 1 (setup).** Once the two browsers find each other and shake hands, the actual voice audio flows **peer-to-peer (P2P)** — it never touches Firebase again. That's why calls are free and low-latency: Firebase doesn't stream the audio, it just introduces the two browsers to each other.

---

## 🗂️ The Resources Used (and what each costs you)

| Resource | Role in calling | Cost |
|----------|----------------|------|
| **Google STUN servers** (`stun.l.google.com`) | Helps each browser discover its own public IP address so the other peer can reach it | Free, unlimited |
| **Firebase Firestore** (`likes` collection) | Acts as the signaling channel — the "mailbox" where caller and callee exchange offers, answers, and ICE candidates | Uses your existing Spark (free) plan; writes are small strings |
| **Browser `RTCPeerConnection`** | The actual WebRTC engine that captures mic audio and sends it P2P | Runs in the user's browser — zero server cost |
| **Web Audio API** (`AudioContext`) | Generates the ringtone chime on the callee side, entirely in the browser | Free, client-side |

> 🪄 **Cost-saving trick:** Call documents are stored inside the **`likes` collection**, not a new `calls` collection. Why? Because your `firestore.rules` already grants any authenticated user read/write access to `likes/{likeId}` (`allow read, write: if isAuth();`). By naming the doc `call_{callId}`, you reuse existing open rules and skip needing to deploy new Firestore security rules or composite indexes.

---

## 📂 File-by-File Breakdown

### 1. `src/firebase/calls.js` — The Signaling Layer

This is the **mailbox**. It defines how call documents are written to and read from Firestore.

**ICE config (`ICE_CONFIG`):** Lists three free Google STUN servers. A STUN (Session Traversal Utilities for NAT) server is like a mirror — your browser asks it "what's my public IP?" so it can hand that address to the other peer.

**The call document** lives at `likes/call_{callId}` and looks like:

```
{
  isCall: true,
  callId: "userA_uid_userB_uid_1690000000000",
  callerId, callerName, callerUsername, callerPhotoURL, callerIsVerified,
  calleeId, calleeName, calleeUsername, calleePhotoURL, calleeIsVerified,
  status: "ringing",   // ringing → active → declined|ended|missed
  offer: null,          // caller's SDP "invitation"
  answer: null,         // callee's SDP "acceptance"
  callerIce: [],        // caller's network paths (ICE candidates)
  calleeIce: [],        // callee's network paths (ICE candidates)
  createdAt: 1690000000000
}
```

**The helper functions** each write one piece of this mailbox:

| Function | What it writes | When it's called |
|----------|----------------|------------------|
| `createCallDoc()` | Creates the document, status `ringing`, all fields blank | Caller initiates |
| `setCallOffer(offer)` | Sets `offer` (the caller's SDP) | After caller generates an offer |
| `setCallAnswer(answer)` | Sets `answer` + flips status to `active` | After callee accepts |
| `addCallerIce(c)` / `addCalleeIce(c)` | Appends one ICE candidate string to the right array | Continuously as each browser discovers network paths |
| `setCallStatus(status)` | Changes `status` (`declined` / `ended` / `missed`) | Hang up, decline, or no-answer timeout |
| `listenToCall(callId, cb)` | Real-time `onSnapshot` on one call doc | Both sides watch for updates |
| `listenForIncomingCalls(userId, cb)` | Real-time query: all docs where `calleeId == me` and `status == 'ringing'` | Caldee's app runs this constantly |

> Note: ICE candidates are **stringified with `JSON.stringify`** before storing, and `arrayUnion` is used so writes from concurrent listeners don't overwrite each other.

---

### 2. `src/contexts/CallContext.jsx` — The Brains (State Machine + WebRTC)

This React Context manages the **whole lifecycle** of a call. It's a state machine with four states:

```
idle  →  ringing_out  →  active  →  idle  (caller's path)
idle  →  ringing_in   →  active  →  idle  (callee's path)
```

#### 🔻 Caller flow: `startCall(calleeId, calleeProfile)`
1. Generates `callId = callerUid_calleeUid_timestamp` and stores it in a ref.
2. Calls `createCallDoc(...)` to drop the "mailbox" in Firestore.
3. Asks the browser for mic access: `navigator.mediaDevices.getUserMedia({ audio: true, video: false })`.
4. Builds an `RTCPeerConnection` (using `ICE_CONFIG`) and attaches the local mic track.
5. Sets `onicecandidate` → every time the browser discovers a network path, `addCallerIce` writes it to Firestore.
6. Creates an **Offer** (SDP = Session Description Protocol — describes audio codecs, formats), sets it locally, then `setCallOffer` writes it to Firestore.
7. Starts `listenToCall(callId)` watching for the callee's answer + ICE candidates.
8. **45-second timeout:** if still `ringing_out`, marks `missed` and cleans up.

#### 🔻 Callee flow (two halves)
- **Listener:** `useEffect` on mount runs `listenForIncomingCalls(currentUser.uid, ...)`. Whenever a call doc appears with their `calleeId` and `status: 'ringing'`, it stores the call data, sets `remoteUser`, and flips to `ringing_in` → this triggers `IncomingCallModal`.
- **`acceptCall()`:** Gets mic access → builds `RTCPeerConnection` → sets the caller's offer as the remote description → applies any caller ICE already in the doc → creates an **Answer**, writes it via `setCallAnswer(...)` (which also flips status to `active`) → starts the call timer.

#### 🔻 Shared helpers
- `applyRemoteIce(list)`: Reads ICE candidate strings from the doc, **dedupes** them using a `Set` (prevents adding the same candidate twice), parses them, and feeds them to the peer connection.
- `buildPeerConnection()`: Creates the `RTCPeerConnection`. Its `ontrack` handler receives the **remote stream** and wires it to the hidden `<audio>` element in `AppShell` (via `remoteAudioRef`) — that's what makes the other person's voice come out of the speaker.
- `cleanup()`: Stops all tracks, closes the peer connection, unsubscribes listeners, clears the timer, resets state. Called on hang-up, decline, or any error.
- `toggleMute()`: Flips the `enabled` flag on the local audio track (doesn't disconnect the stream) and toggles the `isMuted` UI state.

> ⚠️ **Busy handling:** If a call comes in while `callState !== 'idle'`, the listener auto-declines it (`setCallStatus('declined')`) so a third user can't barge in.

---

### 3. `src/components/IncomingCallModal.jsx` — The Ring Screen

Shown only when `callState === 'ringing_in'`.

- Renders a full-screen dark modal with pulsing rings around the caller's avatar (`callPulse` animation), plus Accept (green) and Decline (red) buttons.
- **Ringtone:** Uses the **Web Audio API** (`AudioContext`) to generate a two-tone chime (880 Hz + 660 Hz sine waves) looping every 1.2s. This is synthesized entirely in the browser — **no audio file is downloaded or stored**, so it's free and instant. The `useEffect` cleans up by setting `playing = false` and closing the `AudioContext`.
- Buttons call `acceptCall()` / `declineCall()` from the context.

---

### 4. `src/components/ActiveCallUI.jsx` — The In-Call HUD

A small floating card at the bottom of the screen shown when `callState === 'active'` or `'ringing_out'`.

- Shows the remote user's avatar, name (+ verified badge), live call timer (`duration`, formatted `mm:ss`), a green "active" dot once connected.
- While `ringing_out`, shows an animated "Calling…" text instead of the timer, and hides the mute button (you can't mute before the call connects).
- **Mute button** (`toggleMute`) and **End call button** (red, rotated phone icon → calls `endCall`).
- `endCall()` writes `status: 'ended'` to Firestore and runs `cleanup()` on both peers' end (the other side listens and also cleans up).

---

## 🔁 Putting It Together: A Complete Call Timeline

```
  CALLER (A)                              FIRESTORE (signaling)                    CALLEE (B)
  ─────────                              ──────────────────────                    ─────────
                                                                              
  taps "Call"                                                                        (idle, listening via
                                                                                      listenForIncomingCalls)
                       ── createCallDoc ──►   [doc created, status:ringing]   ──►  IncomingCallModal opens
                                                                                      ringtone chime starts
  getUserMedia(mic)                                                                 
  build RTCPeerConnection                                                            
  ── setCallOffer(SDP) ──►             [doc.offer = A's SDP]
  collect ICE candidates   ── addCallerIce ──► [doc.callerIce grows]               user taps Accept
                                                                                      
                                                                                      getUserMedia(mic)
                                                                                      build RTCPeerConnection
                                                                                      setRemoteDescription(offer)
                                                                                      applyRemoteIce(callerIce)
                       ◄── setCallAnswer(SDP) ──                              [doc.answer = B's SDP, status:active]
  setRemoteDescription(answer)                                                      collect ICE candidates
  applyRemoteIce(calleeIce) ◄── addCalleeIce ──                                [doc.calleeIce grows]
                                                                                      
  ════════ P2P AUDIO STREAM NOW FLOWS DIRECTLY A ⇄ B ════════
  (Firestore is no longer involved in media transport)

  A taps End → setCallStatus('ended') ──►   [status:ended]   ──► B's listener sees 'ended' → cleanup()
  cleanup()                                                                          (call card disappears)
```

---

## 🧩 Key Technical Concepts, Quick Reference

- **SDP (Session Description Protocol):** A text description of the media (codecs, format, bandwidth) the browser wants to send/receive. Exchanged as `offer` (caller) and `answer` (callee).
- **ICE (Interactive Connectivity Establishment):** Finding a workable network path between two browsers, which often sit behind NAT/routers. Candidates are the candidate addresses; WebRTC tries them until one connects.
- **STUN:** A free server that reflects a browser's public IP back to it. **No media flows through STUN** — it's only for discovery. (A **TURN** server *would* relay media if P2P fails — Palzy doesn't use one, so very restrictive NATs may fail; that's an acceptable trade-off for a college LAN/Wi-Fi app.)
- **`onSnapshot`:** Firestore real-time listener — the linchpin that makes Firestore act like a WebSocket. Every listener re-runs instantly when the doc changes.
- **`arrayUnion`:** Firestore atomic append — lets both sides append ICE candidates to the same array without write races.

---

## ⚠️ Limitations & Future Improvements

1. **No TURN server** → calls between users behind strict symmetric NATs may not connect. Adding a free TURN provider (e.g. OpenRelay) would fix this.
2. **No reconnection** → if a user refreshes mid-call, the call drops and must be re-initiated (cleanup runs on unmount).
3. **Just audio** → upgrading to video is trivial: set `video: true` in both `getUserMedia` calls and render a `<video>` element bound to the remote stream. The signaling layer stays identical.
4. **Call docs aren't auto-deleted** → old `call_*` docs linger in the `likes` collection. A nightly cleanup or deletion-on-`ended` would keep it tidy.
5. **No call history** → deleting call docs means there's no "recents" list. Keeping docs with `status: ended` + a read-friendly collection could enable a Recents screen.

---

## ✅ What Makes This Architecture Smart

- **Zero new backend** — no WebSocket server to deploy, scale, or pay for. Firestore's `onSnapshot` does the job.
- **Zero new infra costs** — STUN is free, Firestore signaling uses tiny writes on the free tier, and media is P2P.
- **Reuses existing security rules** — by nesting in `likes`, you skip deploying new Firestore rules.
- **Graceful UX** — timeouts (45s no-answer), busy auto-decline, synthesized ringtone (no asset downloads), mute toggle, and real-time hang-up propagation.
