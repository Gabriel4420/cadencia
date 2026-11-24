# Security Specification — Cadência Firestore Rules

## 1. Data Invariants
- Every document under `/users/{userId}/tasks/{taskId}` and `/users/{userId}/profile/{docId}` belongs strictly to the authenticated, email-verified user matching `request.auth.uid == userId`.
- No user can read, list, create, update, or delete another user's tasks or gamification profile.
- All path IDs (`userId`, `taskId`, `docId`) must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.
- No PII (email, phone, address) is persisted in Firestore collections.
- All incoming payloads are strictly validated against required keys, allowed keys (`hasOnly`), string length bounds, numeric bounds, and bounded list sizes (`unlockedRewardIds.size() <= 20`).
- Immutable fields (`id`, `userId`, `createdAt`) cannot be mutated on update.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read on `/users/u1/tasks/t1`.
2. Authenticated user `u2` attempting `get` or `list` on `/users/u1/tasks`.
3. Unverified email user (`email_verified: false`) attempting `create` on `/users/u1/tasks/t1`.
4. Identity spoofing: `u1` creating task under `/users/u1/tasks/t1` with `userId: "u2"`.
5. Shadow field injection: `create` task with extra field `isAdmin: true`.
6. Oversized title (> 140 chars) or oversized description (> 600 chars) Denial-of-Wallet attack.
7. Path ID poisoning: `taskId` with 200 characters or invalid characters (`../hack`).
8. Invalid enum value: `priority: "critical"` or `category: "unknown"`.
9. Immutable field tampering: updating `userId` or `createdAt` on an existing task.
10. Value poisoning on update: changing `durationMinutes` to `"999"` (wrong type) or `-50` (out of range).
11. Unbounded array poisoning: setting `unlockedRewardIds` with > 20 items or non-string first element.
12. Ghost update on profile: updating profile with an unknown key `role: "admin"`.
