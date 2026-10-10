import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCollegePin, collegePinVariants } from '../src/utils/collegePin.js'

test('accepts old and new student-number formats', () => {
  assert.equal(normalizeCollegePin('24170-CM-017'), '24170-CM-017')
  assert.equal(normalizeCollegePin('26170CM001'), '26170-CM-001')
  assert.equal(normalizeCollegePin(' 24170-cm-017 '), '24170-CM-017')
})

test('rejects short numbers, partial hyphens, spaces, symbols and trailing data', () => {
  for (const value of ['test', '1234', '24170-ME-017', '26170EE001', '24171-CM-017', '26001CM001', '24170CM-017', '24170-CM017', '24170-CM-17',
    '24170-CM-0170', '24170-CMM-017', '24170 CM017', '24170-CM-017extra', '', null]) {
    assert.equal(normalizeCollegePin(value), null, String(value))
  }
})

test('looks up both representations to avoid format-based duplicates', () => {
  assert.deepEqual(collegePinVariants('26170CM001'), ['26170-CM-001', '26170CM001'])
  assert.deepEqual(collegePinVariants('bad'), [])
})

test('allows CM, CS and EC only', () => {
  for (const branch of ['CM', 'CS', 'EC']) {
    assert.equal(normalizeCollegePin(`26170${branch}001`), `26170-${branch}-001`)
  }
})
