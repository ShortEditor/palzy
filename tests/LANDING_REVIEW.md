# Public landing page review

Signed-out `/` shows the introduction. Signed-in `/` keeps the existing protected feed and profile/PIN gates. `/welcome` stays public so staff and members can share a stable introduction. Login, privacy, terms and protected member routes keep their existing behavior.

The landing uses the app's existing CSS variables, fonts, icon/logo assets and light/dark theme provider. The cards illustrate actual supported notes/collaboration features and are explicitly labeled as illustrations, not real posts. There are no public Firestore reads or member posts/profile data on this page, no usage totals or enrollment/security claims.

Checked build, pinned lint, dark mobile and light desktop pixels plus theme switching and overflow. Screenshots use a local rendering harness, not a real member session. Confirm root routing, auth gates and public links on the Vercel preview before merge.

This PR is based on counter PR #2; after predecessors merge it should be retargeted/rebased to main. Do not merge into the counter branch. No Firebase rule deployment or paid service changes.
