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