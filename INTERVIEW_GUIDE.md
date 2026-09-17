# Palzy — Complete Interview Preparation Guide

> A standalone study document covering the entire Palzy project: architecture, database design,
> security rules, feature flows, performance patterns, debugging stories, and likely interview
> questions. All file paths refer to files in this repository, so you can open the code while revising.

---

## 1. The 60-Second Elevator Pitch (memorize this)

> "Palzy is a campus-focused social media PWA I built with React 19 + Vite, backed entirely by
> Firebase (Auth + Firestore) and Cloudinary. It has a hybrid follow + engagement-ranked feed,
> 24-hour stories, emoji reactions, threaded comments, hashtags, a Campus Board for
> doubts/notes/collabs, a weekly leaderboard, real-time notifications, a moderation admin panel,
> and even WebRTC voice calling using Firestore as the signaling server. Everything is real-time
> via Firestore snapshot listeners, images are compressed client-side before upload, the app is
> installable via a service worker, and all data access is locked down with granular Firestore
> security rules."

---

## 2. Tech Stack — and WHY (interviewers always ask why)

| Layer | Choice | Why this choice |
|---|---|---|
| UI | **React 19** | Latest React, `createRoot`, hooks-based |
| Build | **Vite 8** | Instant dev server, fast builds, easy manual chunking |
| Routing | **React Router 7** | `React.lazy` code-split routes, `Outlet`-based layout guards |
| Backend | **Firebase Auth + Firestore** (SDK v12, modular v9 API) | No server to manage; real-time listeners out of the box; auth + DB + rules in one platform |
| Media | **Cloudinary** (unsigned upload presets) | Free image CDN with transformations; Firebase Storage deliberately unused |
| Upload UX | react-dropzone, react-easy-crop, browser-image-compression | Drag-and-drop, cropping, client-side compression to save bandwidth |
| Toasts | react-hot-toast | Lightweight, one global `<Toaster>` |
| Dates | date-fns | Relative timestamps ("2h ago") |
| State | **React Context only** (Auth, Theme, Call) — no Redux / React Query / Zustand | App state is small; server state handled directly by Firestore listeners |
| Styling | **One hand-written CSS file** (~1,500 lines) with CSS variables | Full control, light/dark themes via `data-theme` attribute, no framework dependency |
| PWA | vite-plugin-pwa (Workbox) | Installable app, offline caching, Play Store via TWA |
| Lint | oxlint | Fast Rust-based linter |

**Notably absent (worth mentioning proactively):** no Redux, no React Query, no Tailwind,
no TypeScript, no test framework.

**Key architecture sentence to say out loud:**
> "The codebase is a three-layer split — pages (routes) → components (UI) → a per-domain Firebase
> service layer (12 modules: posts.js, users.js, follows.js, notifications.js, reactions.js,
> stories.js, campus.js, doubts.js, leaderboard.js, calls.js, admin.js, config.js). Components
> never talk to Firestore directly; all DB logic lives in the service layer."

---

## 3. Architecture Overview

### Folder structure

```
src/
├── main.jsx            # Entry: ThemeProvider > BrowserRouter > AuthProvider > App + <Toaster>
├── App.jsx             # All route definitions, lazy imports, guards
├── index.css           # THE stylesheet — entire design system (CSS variables, light/dark)
├── components/         # ~25 shared components (PostCard, StoriesBar, AppShell, guards, call UI…)
├── contexts/           # AuthContext.jsx, ThemeContext.jsx, CallContext.jsx
├── firebase/           # Service layer: 12 modules, one per feature domain
├── pages/              # 8 top-level pages + admin/ subfolder
└── utils/              # cloudinary.js, quoteCardRenderer.js, recapCardRenderer.js, shareUtils.js
```

### Routes (src/App.jsx)

| Path | Component | Guard |
|---|---|---|
| `/login` | LoginPage | Public (eager-loaded) |
| `/setup-username` | SetupUsernamePage | ProtectedRoute requireProfile={false} |
| `/admin`, `/admin/users`, `/admin/posts`, `/admin/reports` | Admin pages inside AdminLayout | AdminRoute (checks isAdmin) |
| `/` | FeedPage | Auth + profile, inside AppShellWrapper |
| `/explore` | ExplorePage | Auth + profile |
| `/campus` | CampusPage | Auth + profile |
| `/notifications` | NotificationsPage | Auth + profile |
| `/tag/:tag` | HashtagPage | Auth + profile |
| `/post/:postId` | PostDetailPage | Auth + profile |
| `/u/:username` | ProfilePage | Auth + profile |
| `*` | `<Navigate to="/" replace />` | Catch-all |

- Only Login and SetupUsername are eagerly imported; **all other pages are React.lazy**.
- `AppShellWrapper` wraps main-app routes in `<AppShell><Outlet /></AppShell>`
  (desktop sidebar / mobile bottom nav).
- **Guards:** `ProtectedRoute.jsx` — not logged in → `/login`; logged in but no profile →
  `/setup-username`. `AdminRoute.jsx` — silently redirects non-admins to `/`.

### Global state — three Contexts only

1. **AuthContext** — `currentUser` (Firebase auth), `userProfile` (Firestore users/{uid}),
   `loading`, derived `isAdmin`. One `onAuthStateChanged` listener. Exposes signInWithGoogle,
   signUpWithEmail, signInWithEmail, resetPassword, logout, refreshProfile.
2. **ThemeContext** — light/dark, persisted in localStorage (`palzy-theme`),
   applied via `data-theme` attribute on `<html>`.
3. **CallContext** — WebRTC voice-call state machine
   (`idle | ringing_out | ringing_in | active`), holds RTCPeerConnection/stream refs,
   listens for incoming calls via Firestore snapshot listeners.

### Build & deployment

- `vite.config.js`: `@` alias to `/src`, VitePWA plugin, aggressive `manualChunks`
  (firebase-firestore, firebase-auth, react-dom, react-router, date-fns…), chunkSizeWarningLimit 600.
- `firebase.json`: hosting from `dist/` + SPA rewrite + security headers. `vercel.json` also present.
- Android Play Store listing via TWA (`public/.well-known` assetlinks).
- Env keys: `VITE_FIREBASE_*` (6 keys) + `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`.

---

## 4. Database Architecture (the big one)

### 4.1 Collections and document schemas

**`users/{uid}`** — doc ID = auth UID
- `username` (lowercase, unique — checked via query before signup), `displayName`, `photoURL`
- `bio`, `branch` (CSE/ECE…), `year` (1st–3rd), `showBranch`, `showYear` (privacy toggles)
- `followerCount`, `followingCount` (maintained with increment())
- `streakCount`, `streakLastDate`, `streakBestEver` (posting streak)
- `isAdmin`, `isVerified`, `banned` (privileged — rules block user writes to these)
- `createdAt` (serverTimestamp)
- **`stories` array field** — stories are NOT a separate collection (see 4.4)

**`posts/{postId}`** — auto-ID
- `authorId`, `content` (≤500 chars), `imageURL`, `type` (`text | image | quote`)
- `tags` array (doubt / note / collab — mutually exclusive pills in CreatePost)
- `hashtags` array (max 10, extracted by regex `/#([a-z0-9_]{1,30})/gi`)
- `likeCount`, `commentCount` (increment()), `emojiCounts` (map)
- `createdAt` (serverTimestamp)
- **Denormalized author snapshot:** `authorName`, `authorUsername`, `authorPhotoURL`,
  `authorIsVerified`, `authorBranch`, `authorYear` — this is why feeds/comments need no joins
- `quoteMetadata` for quote posts: `{templateId, fontId, layoutId, ratioId, text, attribution}`

**`posts/{postId}/comments/{commentId}`** — subcollection
- `authorId` + denormalized author fields, `text` (1–500, validated in rules)
- `parentId` (null = top-level; replies-to-replies are flattened under the ROOT comment
  → clean 2-level threading: `parentId = parent.parentId ?? parent.id`)
- `createdAt`

**`follows/{followerId}_{followeeId}`** — composite doc ID
- `followerId`, `followeeId`, `createdAt`

**`reports/{reportId}`**
- `postId`, `reportedBy`, `reason` (≤500 chars), `status`, `createdAt`

**`likes/{docId}`** — ⭐ THE MOST INTERESTING INTERVIEW TOPIC.
The `likes` collection is deliberately **overloaded as a multi-purpose collection** using
document-ID conventions:

| Doc ID pattern | Purpose | Marker fields |
|---|---|---|
| `{postId}_{userId}` | A like | `postId`, `userId` |
| `{postId}_rxn_{userId}` | User's emoji reaction | `userId`, `emoji` |
| `{postId}_emojiCounts` | Reaction aggregate map | — |
| `notif_{toUid}_{timestamp}_{rand}` | **Notification** | `isNotification: true`, `notifToUid`, `fromUid` |
| `storyview_{storyId}_{viewerId}` | Story view | `isStoryView: true`, `viewerId` |
| `call_{callId}` | **WebRTC signaling doc** | `isCall: true`, `callerId`, `calleeId`, `status`, `offer/answer` (SDP), `callerIce/calleeIce` arrays |

**Why overload one collection?** Deploying new security rules is a separate step from deploying
the app, and `likes` already had open reads. Reusing it with typed doc-ID prefixes meant
notifications, story views, reactions, and call signaling could ship **without deploying new
rules or composite indexes**. Each subtype still has its own surgical rule guards
(see firestore.rules lines 68–133). Frame it as a pragmatic trade-off, not ideal modeling.

### 4.2 Denormalization (expect this question)

Author name/photo/username are copied into every post, comment, and notification.
- **Why:** Firestore has NO joins. Reading a feed of 20 posts with joins = 20+ extra profile
  reads per screen. The snapshot makes feed rendering a single query.
- **Trade-off:** if a user renames themselves, old posts show the old name.
- FeedPage has lazy backfill logic that fetches author profiles for legacy posts missing the snapshot.

### 4.3 Counters

- `likeCount`, `commentCount`, `followerCount` maintained with `FieldPath.increment(±1)` — atomic server-side.
- Likes are wrapped in a **`runTransaction`** (create/delete like + counter together).
- Follow counters: each increment individually wrapped in try/catch so a counter failure can't
  break the follow itself.
- **Self-healing:** `syncFollowCounts` (src/firebase/follows.js) compares stored counts against
  `getCountFromServer()` and patches drift; ProfilePage runs it on every profile load.

### 4.4 Stories — a modeling decision worth explaining

- Instead of a `stories` collection, each user's stories live in **an array field on their own
  user doc** (`stories: [...]`).
- **Expiry is read-time filtering** (`now − createdAt < 24h`), not deletion. Expired stories are
  physically removed lazily on the next `createStory`.
- **Why OK:** stories are small, capped, per-user, and always read together — one `getDoc` per
  author fetches everything (self + up to 30 following in parallel getDocs).
- Current stories are **text on gradient backgrounds** (7 gradients, 4 fonts) — no media upload.
- **Trade-off to mention:** 1MB doc limit means this wouldn't scale to media stories.

### 4.5 Composite indexes (firestore.indexes.json)

| Collection | Fields | Serves |
|---|---|---|
| posts | authorId ASC, createdAt DESC | feed's followed pool |
| posts | createdAt DESC | trending pool / recent posts |
| comments (COLLECTION_GROUP) | createdAt ASC | cross-post comment queries |
| follows | followerId ASC, createdAt DESC | "who I follow" |
| follows | followeeId ASC, createdAt DESC | "who follows X" |
| reports | status ASC, createdAt DESC | admin reports queue |

- Single-field equality queries (`notifToUid == uid`, `calleeId == uid`, `storyId == storyId`)
  need NO index — Firestore auto-indexes single fields.
- Feed's followed query chunks user IDs into batches of **30** (Firestore `in` query limit of 30).

---

## 5. Security Rules (firestore.rules — read it, it's genuinely well done)

Helper functions at the top: `isAuth()`, `uid()`, `isAdmin()` (does a `get()` on the caller's
user doc), `isBanned()`.

- **users**
  - read: any authenticated user
  - create: only your own doc (`uid() == userId`) AND cannot set `isAdmin`/`isVerified`/`banned`
  - update: own doc, but `affectedKeys()` must not touch privileged fields
    (uses `request.resource.data.diff(resource.data).affectedKeys()`)
  - separate update rule: any authed user may update **only** `followerCount`/`followingCount`
    (needed because followers update OTHER people's counters — `hasOnly([...])`)
  - admin can update anything
- **posts**
  - create: not banned AND `authorId == uid()`
  - delete: author OR admin
  - update: only if changed keys `hasOnly(['likeCount','commentCount','emojiCounts'])`
- **comments**: create validates `text is string && size() > 0 && size() <= 500` IN THE RULES —
  server-side validation without a server. Banned users blocked. Delete: author or admin.
- **likes**
  - read: any authed user
  - like create/delete: `userId == uid()`
  - notification create: `fromUid == uid()` (ONLY the sender)
  - notification update: `notifToUid == uid()` AND only the `read` key may change
  - notification delete: `notifToUid == uid()`
  - story view create: `viewerId == uid()`
  - call docs: only caller creates; caller or callee updates/deletes
- **follows**: only the follower can create/delete
- **reports**: read/update admin only; create requires not banned, `reportedBy == uid()`,
  reason length 1–500

**Ban enforcement happens at the DATABASE level** — a banned user's client is blocked from
creating posts/comments/reports by rules, not by hiding UI.
**Admin bootstrap is manual** (Firebase Console → users/{uid} → isAdmin: true) — no user can
self-grant admin because of the affectedKeys() rules.

---

## 6. Feature-by-Feature Flows

### 6.1 Authentication (src/contexts/AuthContext.jsx)

- Google popup + email/password (signup with `updateProfile` displayName), password reset.
- One `onAuthStateChanged` listener; on sign-in it **awaits the Firestore profile fetch BEFORE
  setting loading=false** — prevents a real bug where ProtectedRoute wrongly redirected to
  `/setup-username` on a second device.
- Flicker prevention, three layers: full-screen spinner while loading in App.jsx; spinners in
  guards; route grouping (setup-username vs main app).
- Setup-username flow: input sanitized to `/^[a-z0-9_]{3,20}$/` → **500ms debounced** uniqueness
  check (`isUsernameTaken`) with a state machine `idle→checking→ok|taken|invalid` →
  Cloudinary avatar upload (optional) → `setDoc` profile with counters at 0 → refreshProfile → navigate `/`.
- Login UI: tabbed signin/signup/forgot, 4-check password strength meter,
  `friendlyError(code)` maps Firebase error codes to human text.

### 6.2 Feed — hybrid follow + trending ranking (src/firebase/posts.js: getFeedPosts, scorePost)

1. **Followed pool:** `[self, ...following]` capped at 90 UIDs, split into chunks of **30**
   (Firestore `in` limit) → parallel queries `where authorId in chunk, orderBy createdAt desc, limit 60`;
   dedupe via `seenIds`; tagged `_isFollowed=true`.
2. **Trending fill:** global `orderBy createdAt desc, limit 60`, dedupe, `_isFollowed=false`.
3. **Client-side ranking:** `score = likeCount×3 + commentCount×2 + max(0, 50 − ageHours)`
   then **+15 flat boost if followed**; sort desc.
   (Don't confuse with Campus "Hot This Week": `likeCount×2 + commentCount×3`, no recency term.)
4. **Pagination:** 5 posts at a time **from the in-memory scored array** (integer cursor), NOT
   Firestore startAfter. Triggered by an **IntersectionObserver** on a 40px sentinel div.
5. FeedPage: dedupes across pages with `seenIdsRef`; optimistically prepends newly created posts;
   "touch some grass" end-of-feed marker; 5 skeleton cards while loading.

**Critique to volunteer:** offset pagination over a re-scored pool means page composition can
shift between scrolls — a fair trade-off vs Firestore's inability to sort by computed engagement.

### 6.3 Post creation + Cloudinary + Quote cards

- CreatePost: 500-char limit, hidden file input AND drag-drop, three mutually exclusive tag pills
  (doubt/note/collab), Ctrl/Cmd+Enter submits.
- **@mention autocomplete:** regex `/@([a-z0-9_]*)$/i` on text before the caret → 250ms debounce →
  Firestore range query `username >= q AND username <= q+'\uf8ff', limit 6` → splices username,
  restores caret position.
- **Cloudinary pipeline** (src/utils/cloudinary.js): `browser-image-compression`
  `{maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp'}` —
  only if file >1.5MB and not a quote card → unsigned preset POST to Cloudinary API →
  structured `public_id` (`palzy/{folder}/{uid12}_{yyyymmdd_hhmmss}_{rand4}`) with context
  metadata and tags → returns `secure_url`.
- `createPost` denormalizes the author snapshot into the post doc; `extractHashtags` stores
  lowercase unique max-10 array; streak update is fire-and-forget (consecutive-day logic).
- **Quote cards = canvas-rendered share images, not native reposts** (quoteCardRenderer.js):
  1080px canvas, 3 ratios, 8 templates (gradient painters, grid "Slate", seeded-RNG starfield
  "Cosmos" via mulberry32), 5 fonts loaded via `document.fonts.load`, auto-size font by binary
  descent (80px→24px), and a 128×128 **noise pattern at ~3% alpha with 'overlay' composite to
  kill gradient banding**. Flow: canvas.toBlob → File → uploadImage('quote-cards') → createPost.
- Crop modal: react-easy-crop → canvas crop → JPEG 0.92 File (avatar aspect 1, banner aspect 3).

### 6.4 Likes & emoji reactions

- Composite doc ID `likes/{postId}_{userId}` means "did I like this?" is a **single `getDoc`**
  (one read, no query) — `batchCheckLikes` runs these in parallel per page.
- `toggleLike` is a **`runTransaction`**: like exists → delete + `increment(-1)`;
  else → set + `increment(+1)`. Transaction returns post author/content so the **like
  notification fires OUTSIDE the transaction** (fire-and-forget, "Someone" fallback).
- UI: optimistic toggle + count change, **reverts on error**.
- Emoji reactions (5: 😂🔥😮😮👏😢): user reaction at `{postId}_rxn_{userId}`, aggregate at
  `{postId}_emojiCounts`. `toggleEmojiReaction` transaction handles three cases:
  toggle-off (delete + decrement), swap (update + old↓ new↑), new (set + increment).

### 6.5 Comments

- Stored in `posts/{postId}/comments` subcollection with denormalized author fields.
- **2-level threading flattened:** `handleReplySubmit` sets `parentId = parentComment.parentId ??
  parentComment.id` so reply-to-a-reply nests under the root. Rendering groups topLevel + replyMap.
- **Delete with cascade:** query replies `where parentId == commentId`, then a **`writeBatch`**
  deletes them + the comment + `commentCount: increment(-(replies+1))`. UI removes subtree locally.
- Not real-time: one-shot `getComments(orderBy createdAt asc)`; new comments appended to local state.
- RichText component renders clickable @mentions/#hashtags/links.

### 6.6 Follow system

- Docs `follows/{followerId}_{followeeId}`; `followUser`: setDoc first, then BOTH user docs'
  counters incremented (each in its own try/catch), then a fire-and-forget follow notification.
- Rules permit counter-only updates by any authed user (`hasOnly(['followerCount','followingCount'])`).
- **Friends-of-friends recommendations:** take first 15 of my following → fetch each one's
  following in parallel → score candidates by mutual count → keep up to 2 `mutualSamples`
  (rendered as stacked mini-avatars). Fallback: recent users for empty graphs.
- **Self-healing counts:** `syncFollowCounts` uses `getCountFromServer` on both queries and
  patches the user doc if drift detected; runs on every profile load.
- FollowButton: optimistic toggle, Twitter-style red "Unfollow" on hover.

### 6.7 Stories (24h)

- Storage: **array field `stories` on the user's own doc** (see 4.4). Story ID `story_{uid}_{ts}`,
  denormalized author fields, gradient CSS from STORY_GRADIENTS (7), font from STORY_STORY_FONTS (4),
  `createdAt` = JS `Date.now()` number.
- `getActiveStories`: fetch profiles of self + up to 30 following via parallel `getDoc`,
  filter each array by the 24h window, group per author, self first.
- Viewer (StoryViewerModal): **5s auto-advance** via `setInterval(100ms)` stepping progress += 2;
  per-story progress bars (past=100%, current=live %, future=0%); pauses when viewers sheet open;
  tap zones 35% left / 65% right; walks group → next group → close.
- **Seen tracking, dual-layer:** (1) localStorage `palzy_viewed_stories` drives
  gradient-vs-gray rings in StoriesBar; (2) Firestore write `likes/storyview_{storyId}_{viewerId}`
  (only for others' stories) — owner reads viewers via query and shows "👁 N views" sheet.

### 6.8 Notifications & the notifToUid permission workaround

- Producers: like, reaction, comment/reply, follow. Never self-notifies.
  `TYPE_CONFIG` also defines `mention` and `call` types.
- Doc ID `notif_{toUid}_{ts}_{rand}`; stored in the **likes collection** with
  `isNotification: true, notifToUid, fromUid`; content previews truncated to 80 chars.
- **Why it works (the interview answer):** instead of deploying new rules for a notifications
  collection, reuse the collection that already had open reads (`likes`), and add surgical
  write rules: create requires `isNotification && fromUid == uid()` (sender-only); update allows
  ONLY the `read` key when `notifToUid == uid()`; delete requires `notifToUid == uid()`.
  The listener query `where('notifToUid','==',uid)` is a single-field equality — auto-indexed,
  so no composite index either.
- Real-time badge: `onSnapshot` on that query, filters `isNotification` client-side,
  sorts newest-first in memory. Subscribed twice: NotificationBell (mobile, "9+" pill) and
  AppShell desktop sidebar (dot + count pill).
- NotificationsPage: **auto-markAllRead on mount** (batched writeBatch update read:true);
  rows show type icon overlaid on actor avatar, post/comment preview, unread tint;
  row click navigates to /post/:id or /u/:username; inline FollowButton on follow notifs;
  per-row delete and batched clear-all.

### 6.9 Campus Board + weekly leaderboard

- Posts carry a `tags` array (doubt/note/collab).
- **Query strategy:** fetch pool of 100 newest posts (`orderBy createdAt desc`, startAfter cursor),
  then **client-side filter** by tag + branch/year. Rationale in code comments: avoids a missing
  composite index on `tags array-contains + createdAt`. Trade-off: tagged posts beyond the newest
  100 are missed.
- Hot This Week: 100 recent → `engagementScore = likeCount×2 + commentCount×3` → top 20.
- CampusPage: 4 tabs, filter pills (branch/year defaulting to viewer profile), dedupe seenIds,
  IntersectionObserver infinite scroll, per-page author hydration + batchCheckLikes.
- **Weekly leaderboard** (leaderboard.js): week window starts **Monday 00:00 local**
  (Sunday remap `dayOfWeek === 0 ? 6 : dayOfWeek - 1`); query `posts where createdAt >= Timestamp`;
  score = post count per author; take top count×3, fetch profiles via cached getUserProfile,
  filter branch/year client-side, cut to 5. Shown in ExplorePage with medals, "Resets every Monday".

### 6.10 Profile

- Route `/u/:username`; `getUserByUsername` (equality query on lowercased username).
- Own posts: `getUserPosts` (15/page, **startAfter cursor** + "Load more" button) + batchCheckLikes.
- Edit modal: bio (160), branch/year selects, showBranch/showYear visibility checkboxes;
  avatar/banner → ImageCropModal → Cloudinary → updateUserProfile (whitelisted fields) → refreshProfile.
- **Streak badge** 🔥 (tooltip shows streakBestEver). **Weekly Recap** button: computes this
  week's post count + likesReceived, `renderRecapCard` (recapCardRenderer.js) draws a 1080×1080
  PNG (noise pass, glow gradients, rounded stat cells, avatar clip) and triggers a download.
- Verified badges from denormalized `authorIsVerified` / `isVerified` everywhere.
- Clickable followers/following opens FollowListModal (tabs, my-following Set for button states).
- Anniversary toast once per session if today == profile createdAt month/day.

### 6.11 WebRTC voice calls (Firestore as signaling server) — GUARANTEED interview gold

Files: src/firebase/calls.js, src/contexts/CallContext.jsx, IncomingCallModal.jsx,
ActiveCallUI.jsx, QuickCallModal.jsx; documented in call_explained.md at repo root.

- **State machine:** `idle → ringing_out → active → idle` (caller) /
  `idle → ringing_in → active → idle` (callee).
- **Signaling doc** `likes/call_{callerUid_calleeUid_timestamp}` with
  `status: ringing|active|declined|ended|missed`, `offer`/`answer` (SDP objects),
  `callerIce`/`calleeIce` arrays — **ICE candidates stringified and appended with `arrayUnion`**
  so concurrent writers can't clobber each other.
- **Caller flow (startCall):** create call doc → `getUserMedia({audio:true})` →
  `RTCPeerConnection(ICE_CONFIG)` (3 Google STUN servers) → onicecandidate → addCallerIce →
  createOffer/setLocalDescription/setCallOffer → onSnapshot waits for answer (sets remote
  description), applies calleeIce (deduped via a Set ref), flips to active, starts timer.
  **45s no-answer → status 'missed' + cleanup.**
- **Callee flow:** mount-time listener (`where calleeId == uid`, filtered to isCall && ringing)
  sets ringing_in; if already busy, extra calls are **auto-declined**. acceptCall: mic → PC →
  setRemoteDescription(offer) → apply caller ICE → createAnswer → setCallAnswer (also flips active).
- **UI:** AppShell hosts hidden `<audio>` fed by `pc.ontrack`. IncomingCallModal **synthesizes a
  two-tone ringtone with the Web Audio API** (880/660 Hz sine, 1.2s loop — no asset file).
  ActiveCallUI: timer, mute (track.enabled flip), speaker toggle (`audio.setSinkId` with graceful
  "not supported" toast on mobile), end. `pc.oniceconnectionstatechange` surfaces
  failed/disconnected as an in-UI banner.
- Entry points: PostAuthorCallBtn on every post card, CallButtonOnProfile, QuickCallModal
  (instant in-memory user search), call-type notification rows.
- **Known limits (say them yourself):** no TURN (strict NAT fails), no reconnection on refresh,
  audio-only, call docs linger in likes.

### 6.12 Admin dashboard

- AdminRoute silently redirects non-admins; sidebar link only rendered for admins.
- admin.js: setUserVerified/setUserAdmin/setUserBanned (plain updateDoc — legal only because
  rules' isAdmin() branch permits it), getAdminStats (3 × getCountFromServer), paginated
  getAdminUsers/getAdminPosts/getReports (startAfter), dismissReport, resolveReport
  (delete post + set status), adminDeletePost.
- **Reports flow:** any user reports from PostCard's inline modal (5 canned reasons, ≤500 chars);
  `reportPost` DEDUPES with a `where postId == && reportedBy ==` query before addDoc.
  AdminReports: pending/all filter, post preview, Dismiss vs Delete-post-&-Resolve.
- **Ban enforcement is Firestore-level:** isBanned() in rules blocks creating posts/comments/reports.
- **Role bootstrap is manual** (console → isAdmin: true) because no user can self-grant it.

### 6.13 PWA

- Manifest: standalone/portrait, 192/512 + maskable icons, 3 app shortcuts (Feed, Campus, Explore).
- `registerType: 'autoUpdate'` with Workbox skipWaiting + clientsClaim.
- Runtime caching: Google Fonts **CacheFirst** (1y), Cloudinary images **CacheFirst**
  (200 entries/30d), Firestore REST **NetworkFirst** (5s timeout, 5-min expiry).
- **Install-prompt race fix (commit 8dd3c5f):** a plain `<script>` in index.html captures
  `beforeinstallprompt` into `window.__pwaPrompt` BEFORE React mounts (the event can fire before
  the banner's listener exists). InstallBanner prefers window.__pwaPrompt, hides when already
  `display-mode: standalone`, respects sessionStorage('pwa-dismissed'), android-only.
- First-paint tricks (index.html): inline critical CSS, pre-React splash div removed via
  MutationObserver on #root (8s fallback), non-blocking font preload, preconnect/dns-prefetch
  to Firestore/Identity/Cloudinary, content-protection script (blocks right-click/drag/Ctrl+S
  on images, skipped on localhost).

---

## 7. Performance & Code-Quality Patterns (scatter these through your answers)

- **Code splitting:** only Login/SetupUsername eager; all other routes `React.lazy` + Suspense;
  manualChunks splits firebase/react vendor code for cache stability.
- **Memoization:** `memo(PostCard)`; `useCallback` for fetchers passed into effects;
  `useMemo` for search; **refs to dodge stale closures** (`authorMapRef`, `followingIdsRef`,
  `seenIdsRef` in FeedPage).
- **Caching:** 5-minute in-memory Map cache for profiles (`getUserProfile` with
  invalidateUserCache); module-level cached user list (capped 300) powering **zero-lag
  client-side search** (filterUsersLocally over name/username/branch).
- **Cleanup discipline:** every onSnapshot unsubscribes in effect cleanup (Auth, bell, sidebar,
  CallContext ×2); IntersectionObserver disconnect(); story interval cleared; AudioContext
  closed; requestAnimationFrame cancelled in QuoteCardEditor.
- **UX:** skeleton loaders everywhere, toasts, optimistic updates with rollback
  (like, reaction, follow).
- **Client-side image compression before upload** (saves bandwidth and Cloudinary egress).

---

## 8. Debugging War Stories from Git History (use these — they're proof of real work)

1. **The notification permission saga** (commits 32ba205 → dd7a1c4 → 3adf3f8 → b051fa6 →
   e43576c → dd452ed): notifications kept hitting Firestore permission errors. Tried passing
   postAuthorId client-side (saves a post read), tried a dual-collection sync overhaul, tested,
   ran a full code audit — finally converged on storing notifications in the likes collection
   with a notifToUid field and surgical rules (dd452ed). Story arc: hypothesis → test → revert → proper fix.
2. **White-screen crash** (commit e43576c): StoriesBar/StoryViewerModal used `useCallback`
   WITHOUT importing it from React — a `ReferenceError` in the production bundle that crashed
   the whole FeedPage (StoriesBar renders inside it). Shows understanding of how a single
   render-time throw unwinds the React tree and why the hooks-ordering audit (b051fa6) mattered.
3. **Second-device login redirect bug:** loading flipped false BEFORE the profile loaded →
   users bounced to /setup-username wrongly; fixed by awaiting the profile fetch inside the
   auth listener before clearing loading.
4. **Duplicate posts in feed** (commit db9f656): fixed with a seenIdsRef dedupe across pages.
5. **PWA install prompt race** (commit 8dd3c5f): beforeinstallprompt fired before React mounted;
   fixed by capturing it into window.__pwaPrompt in a plain index.html script.
6. **Follow-count drift** (commit 5047e7a): counters could desync from reality; syncFollowCounts
   self-heals using getCountFromServer on profile load.
7. **Speaker toggle on mobile** (commits 595af9a, 966a39d): setSinkId unsupported → graceful
   toast fallback instead of a crash.

---

## 9. Limitations to Volunteer Proactively (reads as senior-level maturity)

- Feed pagination re-fetches and re-scores on every page → ordering can shift mid-scroll.
- Campus Board filters client-side over the newest-100 posts (avoids a missing composite index
  on `tags array-contains + createdAt`) → tagged posts beyond 100 are missed.
- The weekly leaderboard loads ALL of this week's posts into memory to score them.
- No TURN server for WebRTC (strict-NAT networks fail); audio-only; no reconnection after refresh.
- Call signaling docs are never cleaned from the likes collection.
- The likes collection is readable by any authed user — so notification docs are too
  (unguessable IDs mitigate, but it's a real trade-off).
- localStorage story-seen tracking is per-device.
- The README's "Known Issues" section is partly stale: story creation no longer uses Cloudinary
  (stories are text-on-gradients now) — don't repeat those from memory.

**What you'd do at scale (say this when asked "how would you improve it"):**
Cloud Functions for notifications/counter reconciliation, server-side feed ranking,
per-user notification subcollections, TURN proxy for calls, startAfter-based feed pagination,
Algolia-type search, server-side tag queries with the missing composite index.

---

## 10. Rapid-Fire Q&A Drill

**Q: Why Firestore over SQL + an Express backend?**
A: Real-time snapshot listeners, auth + rules + DB in one platform, zero server ops for a
college app. At scale I'd add Cloud Functions for trusted writes.

**Q: How do you avoid joins?**
A: Denormalized author snapshots on posts/comments/notifications; accepted staleness trade-off;
lazy backfill for legacy docs.

**Q: How are likes stored and why that doc ID?**
A: Composite `{postId}_{userId}` → O(1) existence check via getDoc (one read, no query), and
it's idempotent — a like can't be double-created.

**Q: Transaction vs batch — when?**
A: Transactions read-then-write with automatic retry (toggleLike must KNOW whether the like
exists); batches are blind multi-writes (comment cascade delete).

**Q: How does the feed ranking work?**
A: Two pools (followed via chunked `in` queries + global trending), deduped, scored
`likeCount×3 + commentCount×2 + max(0, 50−ageHours) + 15 if followed`, sorted client-side,
paginated 5 at a time from the scored array via IntersectionObserver.

**Q: Why are notifications inside the likes collection?**
A: Deploying rules is a separate step from deploying the app; likes already had open reads.
Typed doc-ID prefixes (`notif_`, `storyview_`, `call_`, `_rxn_`, `_emojiCounts`) plus surgical
per-subtype rules keep it safe. Honest framing: pragmatic trade-off, not ideal modeling.

**Q: How does voice calling work without a backend?**
A: Firestore is the signaling channel — SDP offer/answer written to a call doc, ICE candidates
appended with arrayUnion, media flows P2P over WebRTC after handshake, STUN for NAT discovery,
no TURN (known limitation).

**Q: How is admin secure?**
A: isAdmin() in rules does a get() on the caller's profile; the user-update rule blocks anyone
from writing isAdmin/isVerified/banned via affectedKeys(); bootstrap is manual in the console.

**Q: How do you prevent banned users from posting?**
A: isBanned() in the security rules blocks post/comment/report creation at the DATABASE level,
not in UI.

**Q: How is the app installable?**
A: vite-plugin-pwa / Workbox: precached bundle, CacheFirst for fonts and Cloudinary images,
NetworkFirst for Firestore REST; beforeinstallprompt captured pre-React into window.__pwaPrompt;
shipped to Play Store as a TWA.

**Q: What's the hardest bug you fixed?**
A: Pick from section 8 — the notification permission saga or the missing-useCallback white
screen are the best stories.

---

*Generated from a full codebase audit of the Palzy repository (83 commits).*
