# Counter integrity rollout

The web client derives post likes, comments and emoji reactions from individual records. Profile follower/following totals come from canonical follow records. Legacy stored number fields and reaction aggregate documents remain in place but are ignored by these views and ranking paths. No backfill, deletion or Firebase billing change is included.

Firestore rules deny ordinary clients changing aggregate numbers; enforce one canonical like/reaction per user and post; constrain emoji choices and follow ownership/identity. Shared notification, call and story-view records cannot bypass engagement checks by adding a userId. Read rules stay unchanged.

## Trade-offs

This uses more Firestore reads within the existing quota. Feed ranking hydrates its candidate pool; an initial feed can issue two queries per candidate post (all matching engagement records plus comment count). Notes/collab/doubts hydrate only filtered results. Reactions use those already-fetched counts. Follow count queries read relationship documents to reject noncanonical legacy records. No extra composite index is required for these new queries. Load errors do not silently trust old post totals.

Rules do not make old contaminated canonical records trustworthy, verify real students, prevent account farms or rate-limit valid comments. Any audit/migration of existing records is separate. Admin profile privileges remain unchanged; admin-editable stored totals do not control the new displayed numbers.

## Deploy sequence

Merge only after review. Deploy web client before deploying rules. Vercel does not deploy Firestore rules. Keep the PIN change and its legacy migration conditions. Review the separately maintained Android app and old web caches first: old like/reaction transactions still try to update aggregates, so rules will reject those entire transactions. Old follow/comment flows may write a record then fail the aggregate write. Do not deploy rules until the shared clients are coordinated.

Tests: `npm run test:counters`, `npm run test:pin`, `npm run test:rules`, `npm run build`. Rules tooling installs without a lockfile change. The emulator uses a demo project, not production.
