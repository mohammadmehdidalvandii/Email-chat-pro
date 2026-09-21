/**
 * File upload API (architecture.md §File Endpoints).
 *
 * Posts multipart/form-data to the backend's file upload endpoint
 * (`POST /files/upload`). Uses the shared `apiRequest` wrapper so
 * the response envelope is normalized and the JWT Bearer token is
 * attached via the `apiClient` interceptor automatically.
 */
import { apiRequest } from './client'
import type { FileUploadResponse } from '@email-chat-pro/types'

/**
 * Uploads a single file via the backend's `/files/upload` endpoint.
 *
 * `formData` must include `file` and `type` (`'image'|'video'`).
 * Returns `FileUploadResponse` (shared contract with `{ url: string }`).
 * Throws `ApiRequestError` on failure.
 */
export async function uploadFileApi(formData: FormData): Promise<FileUploadResponse> {
  return apiRequest<FileUploadResponse>({
    method: 'POST',
    url: '/files/upload',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
