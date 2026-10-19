## Current Task

Implement the Full-Stack User Profile Avatar Upload feature.

Backend (Phase 1.4 — User Profile, avatar endpoints):
- POST /users/me/avatar — upload/replace the caller's avatar (image validation
  via FilesService, stored as an attachment row with messageId: null).
- DELETE /users/me/avatar — remove the caller's avatar.
- Authorization: target is ALWAYS req.user; no client-supplied user id.
- Verification: avatar backend implemented, type-check + lint + unit tests pass.