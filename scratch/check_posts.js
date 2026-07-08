import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse .env file manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  }
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = `test_poster_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  console.log('Registering temp user...');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;
  console.log('Registered UID:', uid);

  console.log('Writing user document to users/' + uid);
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    name: 'Test Poster',
    username: `test_poster_${Date.now()}`,
    createdAt: serverTimestamp()
  });

  console.log('Writing post document to posts/...');
  const postRef = await addDoc(collection(db, 'posts'), {
    authorId: uid,
    type: 'text',
    content: 'Testing write rules from script!',
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp()
  });
  console.log('Post created successfully with ID:', postRef.id);
  process.exit(0);
}

run().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
