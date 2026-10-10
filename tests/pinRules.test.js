import { readFileSync } from 'node:fs'
import { test, before, after } from 'node:test'
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore'
let env
before(async () => {
  env = await initializeTestEnvironment({projectId: 'demo-palzy-pin', firestore: {rules: readFileSync('firestore.rules', 'utf8')}})
})
after(async () => { await env?.cleanup() })
test('create accepts both formats and all three branches', async () => {
  for (const [i,pin] of ['24170-CM-017','26170CS001','26170-EC-001'].entries()) {
    const uid = `valid-${i}`
    await assertSucceeds(setDoc(doc(env.authenticatedContext(uid).firestore(), 'users', uid), {collegePin: pin}))
  }
})
test('create rejects arbitrary text, wrong college, wrong branch and missing PIN', async () => {
  for (const [i,pin] of ['1234','26171CM001','26170ME001','24170CM-017',''].entries()) {
    const uid = `invalid-${i}`
    await assertFails(setDoc(doc(env.authenticatedContext(uid).firestore(), 'users', uid), {collegePin: pin}))
  }
  await assertFails(setDoc(doc(env.authenticatedContext('missing').firestore(), 'users', 'missing'), {name:'No PIN'}))
})
test('old users can edit other fields without migrating their PIN', async () => {
  await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), 'users', 'legacy'), {collegePin: 'old-pin', name: 'Old'}) })
  const ref = doc(env.authenticatedContext('legacy').firestore(), 'users', 'legacy')
  await assertSucceeds(updateDoc(ref, {name: 'Updated'}))
  await assertFails(updateDoc(ref, {collegePin: 'another-bad-pin'}))
  await assertSucceeds(updateDoc(ref, {collegePin: '26170CS001'}))
})
test('read scope and privilege restrictions stay unchanged', async () => {
  const db = env.authenticatedContext('reader').firestore()
  await assertSucceeds(getDoc(doc(db, 'users', 'valid-0')))
  await assertFails(updateDoc(doc(db, 'users', 'valid-0'), {name:'Not owner'}))
  await assertFails(setDoc(doc(db, 'users', 'reader'), {collegePin:'26170CM001',isAdmin:true}))
})
