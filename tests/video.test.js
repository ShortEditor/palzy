import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canUploadVideo, validateVideoFile, videoStreamUrl, videoPosterUrl, MAX_VIDEO_BYTES } from '../src/utils/video.js'

const admin = { email: 'ShortEditor4@gmail.com' }

test('only the admin account with isAdmin can upload video', () => {
  assert.equal(canUploadVideo(admin, { isAdmin: true }), true)
  assert.equal(canUploadVideo(admin, { isAdmin: false }), false)
  assert.equal(canUploadVideo(admin, null), false)
  assert.equal(canUploadVideo({ email: 'other@gmail.com' }, { isAdmin: true }), false)
  assert.equal(canUploadVideo(null, { isAdmin: true }), false)
})

test('file validation', () => {
  assert.equal(validateVideoFile({ type: 'video/mp4', size: 1000 }), null)
  assert.ok(validateVideoFile({ type: 'image/png', size: 1000 }))
  assert.ok(validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 }))
  assert.ok(validateVideoFile(null))
})

test('delivery urls transform Cloudinary videos and leave others alone', () => {
  const u = 'https://res.cloudinary.com/demo/video/upload/v123/palzy/videos/a.mp4'
  assert.match(videoStreamUrl(u), /\/video\/upload\/f_auto:video,q_auto:eco,c_limit,w_720,vc_auto\/v123\//)
  assert.match(videoPosterUrl(u), /\/video\/upload\/so_1,.*\/v123\/palzy\/videos\/a\.jpg$/)
  assert.equal(videoStreamUrl('https://example.com/a.mp4'), 'https://example.com/a.mp4')
})

import { isS3Video, s3Key } from '../src/utils/video.js'
test('s3 video references', () => {
  assert.equal(isS3Video('s3:videos/a/b.mp4'), true)
  assert.equal(s3Key('s3:videos/a/b.mp4'), 'videos/a/b.mp4')
  assert.equal(isS3Video('https://res.cloudinary.com/x'), false)
  assert.equal(s3Key('https://x'), null)
  assert.equal(MAX_VIDEO_BYTES, 100 * 1024 * 1024)
})

import { LOCKED_VIDEO_PROPS } from '../src/utils/video.js'
test('player strips native controls and download/PiP/cast options', () => {
  assert.equal(LOCKED_VIDEO_PROPS.controls, false)
  for (const f of ['nodownload', 'noremoteplayback', 'noplaybackrate']) assert.match(LOCKED_VIDEO_PROPS.controlsList, new RegExp(f))
  assert.equal(LOCKED_VIDEO_PROPS.disablePictureInPicture, true)
  assert.equal(LOCKED_VIDEO_PROPS.disableRemotePlayback, true)
})
