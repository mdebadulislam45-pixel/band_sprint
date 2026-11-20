# BandSprint Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Owner Isolation (PII Protection)**: Every collection lives under `/users/{userId}` and is strictly scoped to `request.auth.uid == userId`. No authenticated user may read, list, create, update, or delete another user's profile, mistakes, submissions, chats, or study state.
2. **No Privilege Escalation / Ghost Fields**: Client writes to `/users/{userId}` can never introduce or mutate `plan`, `isPremium`, `subscription`, `role`, `isAdmin`, or `credits`. Every document creation enforces `hasOnly(...)` allowlists, and every update enforces `affectedKeys().hasOnly(...)` + `isValid*()` helpers.
3. **Path ID Hardening**: All document IDs (`userId`, `mistakeId`, `submissionId`, `chatId`, `stateId`) must match `^[a-zA-Z0-9_\-]+$` and stay within `<= 128` characters. `stateId` is further restricted to `['diagnostic', 'examSetup', 'spellingProgress']`.
4. **Immutable Ownership & Creation Timestamps**: `uid`, `userId`, `id`, and `createdAt` (once set) cannot be reassigned on updates.
5. **Bounded Payloads**: All strings and arrays enforce explicit `.size()` ceilings to prevent resource exhaustion ("Denial of Wallet").

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Cross-user profile read**: User B attempts `get(/users/userA)` -> DENIED.
2. **Ghost privilege escalation on create**: User A creates `/users/userA` with `{ uid: "userA", email: "a@b.com", isAdmin: true, plan: "pro" }` -> DENIED (`hasOnly`).
3. **Shadow field injection on update**: User A updates `/users/userA` adding `{ credits: 9999 }` -> DENIED (`affectedKeys().hasOnly`).
4. **Identity spoofing in MistakeVault**: User A creates `/users/userA/mistakes/m1` with `{ id: "m1", userId: "userB", module: "reading", item: "test" }` -> DENIED (`data.userId == userId`).
5. **Path ID poisoning**: User A creates `/users/userA/mistakes/invalid$id/with/slash` or 200-char ID -> DENIED (`isValidId`).
6. **Out-of-range Band Score**: User A creates `/users/userA/submissions/s1` with `{ bandScore: 15.0 }` -> DENIED (`bandScore <= 9.0`).
7. **Oversized AI Chat Injection**: User A creates `/users/userA/chats/c1` with a 50KB `userMessage` -> DENIED (`userMessage.size() <= 4000`).
8. **Invalid StudyState Document ID**: User A creates `/users/userA/studyState/arbitraryDoc` -> DENIED (`stateId in ['diagnostic', 'examSetup', 'spellingProgress']`).
9. **Unbounded Spelling Array Poisoning**: User A writes `/users/userA/studyState/spellingProgress` with `payload.masteredWords` containing 10,000 entries -> DENIED (`size() <= 750`).
10. **Immutable Owner Reassignment**: User A updates `/users/userA/mistakes/m1` changing `userId` to `"userB"` -> DENIED (`incoming().userId == existing().userId`).
11. **Unauthenticated List Scraping**: Unauthenticated client lists `/users/userA/submissions` -> DENIED (`isOwner`).
12. **Unmapped Collection Write**: User A writes to `/admins/userA` or `/public/leak` -> DENIED (global default-deny catch-all).
