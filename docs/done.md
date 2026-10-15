## Completed Tasks

- **feat(chat): implement Premium Media Viewer dialog (9-phase) with cache reuse, a11y, RTL, responsive**
  - Adds MediaViewer overlay with large stage + info sidebar + zoom + prev/next + thumbnails
  - Gallery derived from already-loaded TanStack Query history (no extra requests)
  - Reuses attachment-cache (fetchAttachmentBlob / getCachedObjectUrl / getCachedAttachmentBlob / downloadAttachment)
  - Keyboard nav (Escape / ArrowLeft / ArrowRight), backdrop-click close, body scroll lock
  - i18n keys added to en/fa chat.json (mediaViewer namespace)
  - No DB/migrations, no new dependencies, no rate-limit changes, no secret exposure
  - Co-Authored-By: Claude Code <noreply@anthropic.com>