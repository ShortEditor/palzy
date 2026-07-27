import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import {
  createCallDoc, setCallOffer, setCallAnswer,
  addCallerIce, addCalleeIce, setCallStatus,
  listenToCall, listenForIncomingCalls, ICE_CONFIG,
} from '../firebase/calls'
import toast from 'react-hot-toast'

const CallContext = createContext(null)

export function CallProvider({ children }) {
  const { currentUser, userProfile } = useAuth()

  // ── State ────────────────────────────────────────────────────
  const [callState, setCallState]     = useState('idle')  // idle | ringing_out | ringing_in | active
  const [remoteUser, setRemoteUser]   = useState(null)    // { name, username, photoURL, isVerified }
  const [isMuted, setIsMuted]         = useState(false)
  const [isSpeaker, setIsSpeaker]     = useState(false)
  const [duration, setDuration]       = useState(0)
  const [errorMsg, setErrorMsg]       = useState(null)    // null or string shown in ActiveCallUI
  const [incomingCallData, setIncomingCallData] = useState(null)

  // ── Refs ─────────────────────────────────────────────────────
  const callIdRef      = useRef(null)
  const isCallerRef    = useRef(false)
  const pcRef          = useRef(null)              // RTCPeerConnection
  const localStreamRef = useRef(null)
  const callUnsubRef   = useRef(null)
  const incomingUnsubRef = useRef(null)
  const timerRef       = useRef(null)
  const addedIceRef    = useRef(new Set())         // dedup remote ICE candidates
  const remoteAudioRef = useRef(null)              // <audio> element in AppShell

  // ── Incoming call listener ───────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return
    const unsub = listenForIncomingCalls(currentUser.uid, (calls) => {
      if (calls.length === 0) return
      if (callState !== 'idle') {
        // Already busy — auto-decline extra calls
        calls.forEach(c => setCallStatus(c.callId, 'declined').catch(() => {}))
        return
      }
      const call = calls[0]
      callIdRef.current = call.callId
      setIncomingCallData(call)
      setRemoteUser({
        name: call.callerName,
        username: call.callerUsername,
        photoURL: call.callerPhotoURL,
        isVerified: call.callerIsVerified,
      })
      setCallState('ringing_in')
    })
    incomingUnsubRef.current = unsub
    return () => unsub()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid])

  // ── Helpers ──────────────────────────────────────────────────
  const applyRemoteIce = useCallback((iceList = []) => {
    if (!pcRef.current) return
    iceList.forEach(str => {
      if (addedIceRef.current.has(str)) return
      addedIceRef.current.add(str)
      try { pcRef.current.addIceCandidate(new RTCIceCandidate(JSON.parse(str))) } catch {}
    })
  }, [])

  const buildPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_CONFIG)
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0]
      }
    }
    // Detect ICE failures / dropped connections
    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState
      if (s === 'failed') {
        setErrorMsg('Connection failed — both devices may be on strict networks. Try on a different Wi-Fi or mobile data.')
      } else if (s === 'disconnected') {
        setErrorMsg('Connection unstable — call may have dropped.')
      } else if (s === 'connected' || s === 'completed') {
        setErrorMsg(null)
      }
    }
    return pc
  }, [])

  const startTimer = useCallback(() => {
    setDuration(0)
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
  }, [])

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current)
    timerRef.current = null
    callUnsubRef.current?.()
    callUnsubRef.current = null
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
    addedIceRef.current = new Set()
    callIdRef.current = null
    isCallerRef.current = false
    setCallState('idle')
    setRemoteUser(null)
    setIsMuted(false)
    setIsSpeaker(false)
    setDuration(0)
    setErrorMsg(null)
    setIncomingCallData(null)
  }, [])

  // ── startCall (caller) ───────────────────────────────────────
  const startCall = useCallback(async (calleeId, calleeProfile) => {
    if (!currentUser || !userProfile || callState !== 'idle') return

    const callId = `${currentUser.uid}_${calleeId}_${Date.now()}`
    callIdRef.current = callId
    isCallerRef.current = true

    setCallState('ringing_out')
    setRemoteUser({
      name: calleeProfile.name,
      username: calleeProfile.username,
      photoURL: calleeProfile.photoURL || '',
      isVerified: calleeProfile.isVerified ?? false,
    })

    try {
      await createCallDoc({
        callId,
        callerId: currentUser.uid,
        callerName: userProfile.name,
        callerUsername: userProfile.username,
        callerPhotoURL: userProfile.photoURL || '',
        callerIsVerified: userProfile.isVerified ?? false,
        calleeId,
        calleeName: calleeProfile.name,
        calleeUsername: calleeProfile.username,
        calleePhotoURL: calleeProfile.photoURL || '',
        calleeIsVerified: calleeProfile.isVerified ?? false,
      })

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      // Build peer connection
      const pc = buildPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      // Collect and push ICE candidates
      pc.onicecandidate = (e) => {
        if (e.candidate) addCallerIce(callId, e.candidate.toJSON()).catch(() => {})
      }

      // Create + send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await setCallOffer(callId, { type: offer.type, sdp: offer.sdp })

      // Listen for answer + callee ICE
      callUnsubRef.current = listenToCall(callId, async (data) => {
        if (data.status === 'declined' || data.status === 'ended') {
          if (data.status === 'declined') toast('Call declined 📵', { icon: '📵' })
          cleanup()
          return
        }
        if (data.answer && !pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
        }
        if (data.calleeIce?.length) applyRemoteIce(data.calleeIce)
        if (data.status === 'active' && callState !== 'active') {
          setCallState('active')
          startTimer()
        }
      })

      // Auto-cancel if no answer in 45 seconds
      setTimeout(() => {
        if (callIdRef.current === callId && callState === 'ringing_out') {
          setCallStatus(callId, 'missed').catch(() => {})
          toast('No answer 📴', { icon: '📴' })
          cleanup()
        }
      }, 45_000)

    } catch (err) {
      console.error('startCall error:', err)
      const msg = (() => {
        if (err.name === 'NotAllowedError') return 'Microphone blocked — allow mic access in browser settings and retry.'
        if (err.name === 'NotFoundError')   return 'No microphone found — plug in a mic or use headphones.'
        if (err.name === 'NotReadableError') return 'Mic is in use by another app — close it and retry.'
        if (err.message?.includes('TURN'))  return 'Network error — try on mobile data instead of Wi-Fi.'
        return 'Could not start call — refresh the page and try again.'
      })()
      setErrorMsg(msg)
      toast.error(msg, { duration: 5000 })
      cleanup()
    }
  }, [currentUser, userProfile, callState, buildPeerConnection, applyRemoteIce, startTimer, cleanup])

  // ── acceptCall (callee) ──────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incomingCallData || !currentUser) return

    const callId = callIdRef.current
    const callData = incomingCallData
    setIncomingCallData(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream

      const pc = buildPeerConnection()
      pcRef.current = pc
      stream.getTracks().forEach(t => pc.addTrack(t, stream))

      pc.onicecandidate = (e) => {
        if (e.candidate) addCalleeIce(callId, e.candidate.toJSON()).catch(() => {})
      }

      // Set caller's offer
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))

      // Apply any caller ICE already received
      if (callData.callerIce?.length) applyRemoteIce(callData.callerIce)

      // Create + send answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await setCallAnswer(callId, { type: answer.type, sdp: answer.sdp })

      setCallState('active')
      startTimer()

      // Listen for new caller ICE + end status
      callUnsubRef.current = listenToCall(callId, (data) => {
        if (data.status === 'ended') { cleanup(); return }
        if (data.callerIce?.length) applyRemoteIce(data.callerIce)
      })

    } catch (err) {
      console.error('acceptCall error:', err)
      const msg = (() => {
        if (err.name === 'NotAllowedError') return 'Microphone blocked — allow mic access in browser settings and retry.'
        if (err.name === 'NotFoundError')   return 'No microphone found — plug in a mic or use headphones.'
        if (err.name === 'NotReadableError') return 'Mic is in use by another app — close it and retry.'
        return 'Could not connect — refresh the page and try accepting again.'
      })()
      setErrorMsg(msg)
      toast.error(msg, { duration: 5000 })
      setCallStatus(callId, 'ended').catch(() => {})
      cleanup()
    }
  }, [incomingCallData, currentUser, buildPeerConnection, applyRemoteIce, startTimer, cleanup])

  // ── declineCall ──────────────────────────────────────────────
  const declineCall = useCallback(async () => {
    if (callIdRef.current) await setCallStatus(callIdRef.current, 'declined').catch(() => {})
    cleanup()
  }, [cleanup])

  // ── endCall ──────────────────────────────────────────────────
  const endCall = useCallback(async () => {
    if (callIdRef.current) await setCallStatus(callIdRef.current, 'ended').catch(() => {})
    cleanup()
  }, [cleanup])

  // ── toggleMute ────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setIsMuted(m => !m)
    }
  }, [])

  // ── toggleSpeaker ────────────────────────────────────────
  const toggleSpeaker = useCallback(async () => {
    const audio = remoteAudioRef.current
    if (!audio) return

    // setSinkId is supported in Chrome/Edge (not Firefox/Safari)
    if (typeof audio.setSinkId !== 'function') {
      setErrorMsg('Speaker switching is not supported in this browser. Use Chrome or Edge for this feature.')
      return
    }

    try {
      if (isSpeaker) {
        // Switch back to default (earpiece)
        await audio.setSinkId('default')
        setIsSpeaker(false)
      } else {
        // Enumerate and pick the first non-default speaker output
        const devices = await navigator.mediaDevices.enumerateDevices()
        const speakers = devices.filter(d => d.kind === 'audiooutput')
        // 'communications' devices are typically the earpiece on Windows
        // Pick a non-communications device as loudspeaker, fallback to default
        const speaker = speakers.find(d =>
          d.deviceId !== 'default' && !d.label.toLowerCase().includes('comm')
        )
        await audio.setSinkId(speaker?.deviceId ?? 'default')
        setIsSpeaker(true)
      }
      setErrorMsg(null)
    } catch (err) {
      console.error('toggleSpeaker error:', err)
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Speaker access denied — allow audio output permissions in browser settings.')
      } else {
        setErrorMsg('Could not switch speaker. Your browser or device may not support this.')
      }
    }
  }, [isSpeaker])

  return (
    <CallContext.Provider value={{
      callState, remoteUser, isMuted, isSpeaker, duration, errorMsg,
      incomingCallData, remoteAudioRef,
      startCall, acceptCall, declineCall, endCall, toggleMute, toggleSpeaker,
    }}>
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCall must be inside CallProvider')
  return ctx
}
