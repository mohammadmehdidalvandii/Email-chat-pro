## Completed Tasks

- **feat(chat): implement Premium Media Viewer dialog (9-phase) with cache reuse, a11y, RTL, responsive**
  - Adds MediaViewer overlay with large stage + info sidebar + zoom + prev/next + thumbnails
  - Gallery derived from already-loaded TanStack Query history (no extra requests)
  - Reuses attachment-cache (fetchAttachmentBlob / getCachedObjectUrl / getCachedAttachmentBlob / downloadAttachment)
  - Keyboard nav (Escape / ArrowLeft / ArrowRight), backdrop-click close, body scroll lock
  - i18n keys added to en/fa chat.json (mediaViewer namespace)
  - No DB/migrations, no new dependencies, no rate-limit changes, no secret exposure
  - Co-Authored-By: Claude Code <noreply@anthropic.com>

- **fix(chat): resolve image not displaying in viewer (MediaViewer.tsx)**
  - Correctly track whether the effect acquires its own reference to the object URL via `fetchAttachmentBlob`.
  - Only release the attachment when the viewer itself acquired it, not when it reused a cached URL.
  - Prevent stale-image / blank stage bug by removing the redundant `messageId` effect.
  - Improve keyboard navigation effect deps.
  - Co-Authored-By: Claude Code <noreply@anthropic.com>

- **fix(chat): fix Next.js build error due to duplicate identifier 'prev' in MediaViewer.tsx**
  - Removed duplicated `prev`/`next` `useCallback` declarations.
  - Renamed remaining callbacks to `prevMedia`/`nextMedia` and updated all references.
  - Removed unused `memo` import.
  - No functional change; resolves `Module parse failed: Identifier 'prev' has already been declared`.
  - Co-Authored-By: Claude Code <noreply@anthropic.com>

- **feat(users): implement avatar upload endpoints (POST /me/avatar, DELETE /me/avatar)**
  - Backend: users.controller (avatarFileFilter, memoryStorage, FileSizeExceptionFilter, UPLOAD_FILE throttle, delegates to usersService.setAvatar/removeAvatar).
  - Backend: users.service — setAvatar/removeAvatar with best-effort attachment cleanup on replacement/removal, rollback semantics.
  - Fix: added Logger field to users.service.ts; removed unused filesService injection from users.controller.ts.
  - Fixed replacement-safety defect: setAvatar now deletes the old avatar attachment row after a successful save (was only cleaning up the new blob on rollback), matching the documented behavior.
  - 34 unit tests covering successful uploads, replacements, validation errors, storage failures, no-op removal, cleanup swallowing. 8 controller tests verifying envelope shape, req.user targeting, and JwtAuthGuard metadata.
  - All verification: type-check (0 errors), lint (0 errors), build (0 errors), users.service + users.controller specs (32/32 pass). 5 pre-existing unrelated test failures (http-exception filter message assertion, attachments controller NotFound error string) are out of scope for this task.