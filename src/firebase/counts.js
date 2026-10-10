import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore'
import { db } from './config'
import { engagementCounts } from '../utils/engagementCounts'

// Stored aggregates are not authoritative. Read the underlying owned records.
export async function withPostCounts(posts) {
  return Promise.all(posts.map(async post => {
    const [likes, comments] = await Promise.all([
      getDocs(query(collection(db, 'likes'), where('postId', '==', post.id))),
      getCountFromServer(collection(db, 'posts', post.id, 'comments')),
    ])
    return { ...post, ...engagementCounts(post.id, likes.docs.map(d => ({ id: d.id, ...d.data() }))), commentCount: comments.data().count }
  }))
}
