import { readFileSync } from 'node:fs'
import { test, before, after } from 'node:test'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
let env
const ADMIN = 'shorteditor4@gmail.com'
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-palzy-pin', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', 'admin'), { isAdmin: true })
    await setDoc(doc(db, 'users', 'admin2'), { isAdmin: true })
    await setDoc(doc(db, 'users', 'alice'), { name: 'a' })
  })
})
after(async () => { await env?.cleanup() })
const as = (uid, email) => env.authenticatedContext(uid, { email }).firestore()
const base = uid => ({ authorId: uid, likeCount: 0, commentCount: 0, content: 'hi' })
const video = uid => ({ ...base(uid), type: 'video', videoURL: 'https://res.cloudinary.com/x/video/upload/a.mp4', videoDuration: 12 })

test('existing post shapes (text, image, carousel, quote) still work for everyone', async () => {
  const db = as('alice', 'alice@x.com')
  await assertSucceeds(setDoc(doc(db, 'posts', 't1'), { ...base('alice'), type: 'text' }))
  await assertSucceeds(setDoc(doc(db, 'posts', 't2'), { ...base('alice'), type: 'image', imageURL: 'u', imageRatio: '1:1' }))
  await assertSucceeds(setDoc(doc(db, 'posts', 't3'), { ...base('alice'), type: 'carousel', imageURLs: ['a', 'b'] }))
  await assertSucceeds(setDoc(doc(db, 'posts', 't4'), { ...base('alice'), type: 'quote', quoteMetadata: {} }))
  await assertSucceeds(setDoc(doc(db, 'posts', 't5'), { authorId: 'alice', likeCount: 0, commentCount: 0 }))
})
test('regular user cannot create video posts in any form', async () => {
  const db = as('alice', 'alice@x.com')
  await assertFails(setDoc(doc(db, 'posts', 'v1'), video('alice')))
  await assertFails(setDoc(doc(db, 'posts', 'v2'), { ...base('alice'), videoURL: 'x' }))
  await assertFails(setDoc(doc(db, 'posts', 'v3'), { ...base('alice'), type: 'video' }))
  await assertFails(setDoc(doc(db, 'posts', 'v4'), { ...base('alice'), videoDuration: 3 }))
  await assertFails(setDoc(doc(db, 'posts', 'v8'), { ...base('alice'), videoPoster: 'x' }))
  await assertFails(setDoc(doc(db, 'posts', 'v9'), { ...base('alice'), type: 'video', videoURL: 's3:videos/alice/a.mp4', videoPoster: 'x' }))
})
test('an isAdmin user with a different email cannot create video posts', async () => {
  await assertFails(setDoc(doc(as('admin2', 'other@x.com'), 'posts', 'v5'), video('admin2')))
})
test('the admin account can create video and normal posts', async () => {
  const db = as('admin', ADMIN)
  await assertSucceeds(setDoc(doc(db, 'posts', 'v6'), video('admin')))
  await assertSucceeds(setDoc(doc(db, 'posts', 'n1'), { ...base('admin'), type: 'text' }))
})
test('admin email without the isAdmin flag cannot create video posts', async () => {
  await assertFails(setDoc(doc(as('alice', ADMIN), 'posts', 'v7'), video('alice')))
})
