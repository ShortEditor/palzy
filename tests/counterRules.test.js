import { readFileSync } from 'node:fs'
import { test, before, after } from 'node:test'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
let env
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-palzy-pin',firestore:{rules:readFileSync('firestore.rules','utf8')}})
  await env.withSecurityRulesDisabled(async ctx => {
    const db=ctx.firestore()
    for(const uid of ['alice','bob']) await setDoc(doc(db,'users',uid),{collegePin:'26170CS001',followerCount:99,followingCount:99})
    await setDoc(doc(db,'posts','post'),{authorId:'alice',likeCount:999,commentCount:999})
  })
})
after(async () => { await env?.cleanup() })
const db = () => env.authenticatedContext('alice').firestore()
test('denies owner/other profile counters and post aggregates', async () => {
  for(const uid of ['alice','bob']) await assertFails(updateDoc(doc(db(),'users',uid),{followerCount:500}))
  await assertFails(updateDoc(doc(db(),'users','alice'),{followingCount:500}))
  for(const key of ['likeCount','commentCount','emojiCounts']) await assertFails(updateDoc(doc(db(),'posts','post'),{[key]:500}))
  await assertFails(setDoc(doc(db(),'likes','post_emojiCounts'),{'🔥':999}))
})
test('allows one owned canonical like and reaction, rejects forged ownership/IDs/emoji', async () => {
  await assertSucceeds(setDoc(doc(db(),'likes','post_alice'),{postId:'post',userId:'alice'}))
  await assertFails(setDoc(doc(db(),'likes','random'),{postId:'post',userId:'alice'}))
  await assertFails(setDoc(doc(db(),'likes','post_bob'),{postId:'post',userId:'bob'}))
  await assertSucceeds(setDoc(doc(db(),'likes','post_rxn_alice'),{postId:'post',userId:'alice',emoji:'🔥'}))
  await assertSucceeds(updateDoc(doc(db(),'likes','post_rxn_alice'),{emoji:'😂'}))
  await assertFails(updateDoc(doc(db(),'likes','post_rxn_alice'),{emoji:'bad'}))
  await assertFails(updateDoc(doc(db(),'likes','post_alice'),{postId:'different'}))
  await assertSucceeds(deleteDoc(doc(db(),'likes','post_alice')))
})
test('special likes documents cannot smuggle engagement or change identity', async () => {
  const base={isNotification:true,fromUid:'alice',notifToUid:'bob',postId:'post',userId:'alice'}
  await assertFails(setDoc(doc(db(),'likes','post_alice'),base))
  await assertFails(setDoc(doc(db(),'likes','notif_fake'),base))
  const {userId: _userId,...notification}=base
  await assertSucceeds(setDoc(doc(db(),'likes','notif_safe'),notification))
  await assertSucceeds(setDoc(doc(db(),'likes','call_safe'),{isCall:true,callerId:'alice',calleeId:'bob'}))
  await assertFails(updateDoc(doc(db(),'likes','call_safe'),{userId:'alice',postId:'post'}))
})
test('follows are canonical, non-self and immutable; ownership enforced', async () => {
  await assertSucceeds(setDoc(doc(db(),'follows','alice_bob'),{followerId:'alice',followeeId:'bob'}))
  await assertFails(setDoc(doc(db(),'follows','random'),{followerId:'alice',followeeId:'bob'}))
  await assertFails(setDoc(doc(db(),'follows','alice_alice'),{followerId:'alice',followeeId:'alice'}))
  await assertFails(updateDoc(doc(db(),'follows','alice_bob'),{followeeId:'alice'}))
  await assertFails(deleteDoc(doc(env.authenticatedContext('bob').firestore(),'follows','alice_bob')))
  await assertSucceeds(deleteDoc(doc(db(),'follows','alice_bob')))
})
test('zero initial post counts and genuine comments still work', async () => {
  await assertSucceeds(setDoc(doc(db(),'posts','new'),{authorId:'alice',likeCount:0,commentCount:0}))
  await assertFails(setDoc(doc(db(),'posts','forged'),{authorId:'alice',likeCount:50}))
  await assertSucceeds(setDoc(doc(db(),'posts','post','comments','c'),{authorId:'alice',text:'Hello'}))
  await assertSucceeds(deleteDoc(doc(db(),'posts','post','comments','c')))
})
