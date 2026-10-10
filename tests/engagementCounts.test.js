import { test } from 'node:test'
import assert from 'node:assert/strict'
import { engagementCounts } from '../src/utils/engagementCounts.js'
test('counts canonical likes and reactions, ignores forged and old aggregate records', () => {
  const records = [
    {id:'p_a',postId:'p',userId:'a'},
    {id:'p_rxn_a',postId:'p',userId:'a',emoji:'🔥'},
    {id:'p_rxn_b',postId:'p',userId:'b',emoji:'🔥'},
    {id:'random',postId:'p',userId:'a'},
    {id:'p_emojiCounts',postId:'p', '🔥':999},
    {id:'p_rxn_c',postId:'p',userId:'c',emoji:'bad'},
    {id:'p_c',postId:'p',userId:'c',isNotification:true},
    {id:'other_d',postId:'other',userId:'d'},
  ]
  assert.deepEqual(engagementCounts('p',records), {likeCount:1,emojiCounts:{'🔥':2}})
})
test('zero counts do not trust any stored number', () => {
  assert.deepEqual(engagementCounts('p',[{id:'p_emojiCounts',likeCount:999}]),{likeCount:0,emojiCounts:{}})
})
