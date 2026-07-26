# Palzy: College Social Feed

Palzy is a React-based progressive web app (PWA) that provides a campus-focused social feed for college students. Users can post text, images, and quote cards; react with emojis; comment; follow peers; explore trending content; view campus-specific posts (doubts, notes, collaborations); and receive real-time notifications. The app includes an admin dashboard for content moderation and user management.

**Tagline:** *Your campus. Your vibe. Connect with your crowd.*

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
- [Firebase Setup](#firebase-setup)
- [Cloudinary Setup](#cloudinary-setup)
- [Running the App](#running-the-app)
- [Deployment](#deployment)
  - [Firebase Hosting](#firebase-hosting)
  - [Vercel](#vercel)
- [PWA and Installation](#pwa-and-installation)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Known Issues / Uncertain Areas](#known-issues--uncertain-areas)
- [License](#license)

---

## Features

### User-Facing Features
- **Authentication**: Google Sign-In and Email/Password (with password strength meter).
- **Profile Management**: Edit avatar, banner, bio, branch, year; view posting streak; hide/show branch/year.
- **Posts**: Create text, image, or quote card posts; tag posts as Doubt, Note, or Collab (Campus Board).
- **Interactions**: Like/unlike posts; react with emojis (Haha, Fire, Wow, Clap, Sad); comment and reply; report posts.
- **Feed**: Hybrid ranked algorithm (followed + trending) with infinite scroll.
- **Explore**: Search users and posts; view leaderboard (weekly top posters by branch/year).
- **Campus Board**: View posts tagged as Doubt, Note, or Collab, filterable by branch and year.
- **Hot This Week**: Recent posts ranked by engagement (likes×2 + comments×3).
- **Hashtag Pages**: View all posts containing a specific hashtag.
- **Stories**: 24-hour ephemeral stories (text on gradient backgrounds or images).
- **Notifications**: Real-time notifications for likes, comments, replies, follows, and mentions; unread badge.
- **Follow System**: Follow/unfollow users; view follower/following lists; friend recommendations.
- **Sharing**: Share posts to Instagram Story (native share API) or download image.
- **Weekly Recap**: Generate a downloadable PNG recap card with stats (posts, likes, streak, followers).
- **Theme**: Light/Dark mode toggle (persisted in localStorage).
- **PWA**: Installable offline-capable web app with splash screen and background sync.

### Admin Features (requires `isAdmin: true`)
- **Dashboard**: View total users, posts, and open reports.
- **User Management**: Search users; grant/revoke verified badge (blue tick); ban/unban users; promote/demote admins.
- **Post Management**: Search and delete any post.
- **Report Moderation**: View reported posts; dismiss reports or delete the associated post and resolve the report.

## Technology Stack
- **Frontend**: React 19, React Router 7, Vite 8
- **Styling**: Custom CSS (CSS variables, dark/light mode)
- **State Management**: React Context (AuthContext, ThemeContext)
- **Backend**: Firebase Authentication, Cloud Firestore
- **Image Storage**: Cloudinary (via unsigned upload preset)
- **Image Processing**: browser-image-compression (WebP, max 1MB)
- **PWA**: vite-plugin-pwa (Workbox), manifest.webmanifest, service worker
- **Utilities**: date-fns (relative time), react-hot-toast (toasts), react-dropzone (file upload), react-easy-crop (image cropping)
- **Linting**: Oxlint
- **Scripts**: `dev`, `build`, `lint`, `preview`

## Getting Started

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x (or yarn)
- A Firebase project (with Authentication and Firestore enabled)
- A Cloudinary account (free tier is sufficient)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Project Social Media"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Setup
Create a `.env` file in the project root (copy from `.env.example`):
```dotenv
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```
> **Note**: Never commit your actual `.env` file. Keep it local only.

## Firebase Setup
1. **Create a Firebase project** in the [Firebase Console](https://console.firebase.google.com/).
2. **Enable Authentication**:
   - Enable Email/Password and Google providers.
3. **Enable Cloud Firestore**:
   - Start in test mode (optional) then replace with the provided security rules.
4. **Deploy Firestore Rules and Indexes**:
   - Copy `firestore.rules` to your Firestore rules tab.
   - Copy `firestore.indexes.json` to your Firestore indexes tab (or deploy via Firebase CLI).
5. **Add your Firebase config values** to the `.env` file (see above).

## Cloudinary Setup
1. **Create a Cloudinary account** at [cloudinary.com](https://cloudinary.com/).
2. **Note your Cloud Name** from the dashboard.
3. **Create an unsigned upload preset**:
   - Go to Settings → Upload → Upload presets.
   - Add an upload preset, set Signing Mode to **Unsigned**, and save.
   - Note the preset name.
4. **Add your Cloud Name and unsigned upload preset** to the `.env` file (see above).

## Running the App
- **Development** (hot reload):
  ```bash
  npm run dev
  ```
  The app will be available at `http://localhost:5173` (or similar).
- **Linting**:
  ```bash
  npm run lint
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
  Outputs to the `dist/` directory.
- **Preview Production Build**:
  ```bash
  npm run preview
  ```

## Deployment

### Firebase Hosting
1. Install the Firebase CLI (if not already):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Initialize your project (if not already done):
   ```bash
   firebase init
   ```
   - Select Hosting.
   - Choose your Firebase project.
   - Set `dist` as the public directory.
   - Configure as a single-page app (rewrite all URLs to `/index.html`).
   - Do not overwrite existing files unless prompted.
4. Build and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Vercel
1. Install the Vercel CLI (if not already):
   ```bash
   npm i -g vercel
   ```
2. Log in:
   ```bash
   vercel login
   ```
3. Deploy:
   ```bash
   vercel
   ```
   - Confirm the project settings (framework: Vite, root directory: project root).
   - Vercel will detect the `vercel.json` config (rewrites to `index.html`).

## PWA and Installation
- The app is configured as a Progressive Web App.
- On supported browsers (Chrome, Edge, Safari), an **Install Banner** appears on first visit (or after clearing site data).
- Users can install the app to their home screen or desktop for an app-like experience.
- The install banner respects the user's choice and uses `sessionStorage` to avoid repeated prompts.
- Service workers cache static assets and use a network-first strategy for Firebase API calls (with short-term caching) to ensure fresh data.

## Development Workflow
### Adding a New Feature
1. **UI Components**: Add or modify components in `src/components/`.
2. **Image Uploads**: If the feature involves image uploads, use `uploadImage` from `src/utils/cloudinary.js`.
3. **Firestore Changes**:
   - If adding new collections or fields, update `firestore.rules` and `firestore.indexes.json` as needed.
   - Update the relevant service file in `src/firebase/` (e.g., `posts.js`, `follows.js`).
4. **Lint and Build**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Test**: Verify the feature works in development and production builds.

### Admin Tasks
- Use the admin pages (`/admin/*`) to manage users, posts, and reports.
- Admin functions are in `src/firebase/admin.js`.

### Testing
- The repository does not include unit or integration tests by default.
- Consider adding Vitest/Jest for unit testing and Cypress/Playwright for end-to-end tests if needed.

### PWA Testing
- To test the install flow:
  1. Open the app in Chrome.
  2. Open DevTools → Application → Manifest.
  3. Click "Install" or use the Install Banner.
- After a production build, check the Service Worker tab in DevTools to verify caching.

## Architecture Overview
- **Entry Point**: `src/main.jsx` wraps the app with `ThemeProvider`, `BrowserRouter`, and `AuthProvider`.
- **Routing**: `src/App.jsx` defines lazy-loaded routes and route guards (`ProtectedRoute`, `AdminRoute`).
- **Layout**: `src/components/AppShell.jsx` renders the sidebar (desktop) or bottom nav (mobile) and includes the `InstallBanner`.
- **State**:
  - `AuthContext`: Manages Firebase auth state, user profile, and auth methods.
  - `ThemeContext`: Manages dark/light mode.
- **Data Layer**: Each Firebase feature has a module in `src/firebase/`:
  - `users.js`: Profile CRUD, cache, streak logic.
  - `posts.js`: Post CRUD, feed algorithm, likes, comments.
  - `follows.js`: Follow/unfollow, friend suggestions, count sync.
  - `notifications.js`: Notification creation, real-time listeners.
  - `reactions.js`: Emoji reaction toggle and counts.
  - `stories.js`: 24-hour story lifecycle.
  - `campus.js`, `doubts.js`, `leaderboard.js`: Campus-specific queries.
  - `admin.js`: Admin-only functions.
- **Utilities**:
  - `src/utils/cloudinary.js`: Image upload to Cloudinary (with compression).
  - `src/utils/quoteCardRenderer.js`: Canvas-based quote card generation.
  - `src/utils/recapCardRenderer.js`: Weekly recap card generation.
  - `src/utils/shareUtils.js`: Native share API wrapper.
- **Styling**: `src/index.css` defines CSS variables and global reset.
- **PWA Configuration**: `vite.config.js` includes the `VitePWA` plugin with manifest and workbox settings.

## Known Issues / Uncertain Areas
1. **Story Image Upload**: The `CreateStoryModal` component attempts to import `uploadToCloudinary` from `../utils/cloudinary`, but the utility only exports `uploadImage`. This will cause a runtime error if story image uploads are attempted. Fix: rename the import or update the utility.
2. **Unused Firestore Rules for `emojiReactions`**: The Firestore rules file defines rules for an `emojiReactions/{reactionId}` collection, but the app stores emoji reactions in the `likes` collection. This rules block is currently unused.
3. **Firebase Storage Configured but Unused**: The `storageBucket` is set in the Firebase config and `.env.example`, but no Firebase Storage SDK calls exist. All image uploads go through Cloudinary.
4. **Client-Side Filtering for Campus Board**: The Campus Board queries (doubts, notes, collabs) fetch a pool of recent posts and filter client-side by tags. This may miss tagged posts beyond the pool limit and does not scale with volume.
5. **ReelCard Component**: The `ReelCard` component exists but is not imported or used by any page or component. Its purpose and status are unclear.

## License
This project appears to be a student or personal project and does not include an explicit license. By default, the code is protected by copyright. If you intend to reuse or modify this code, please seek permission from the author.

---
*README generated based on codebase exploration. For the most accurate and up-to-date information, refer to the source code and configuration files.*