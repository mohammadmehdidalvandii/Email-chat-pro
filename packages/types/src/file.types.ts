/**
 * Shared file-upload contracts (architecture.md §File Endpoints).
 *
 * POST /files/upload accepts `multipart/form-data` with `{ file, type }` and
 * returns a FileUploadResponse. These contracts are shared so the frontend
 * consumes the same shape the backend produces once an upload UI is added in a
 * later Phase 4 task.
 */

/** Media types accepted by the file upload endpoint (architecture.md). */
export type UploadFileType = 'image' | 'video'

/** Response contract for POST /files/upload (architecture.md §File Endpoints). */
export interface FileUploadResponse {
  /** Secure URL of the uploaded file, hosted by Cloudinary. */
  url: string
}
