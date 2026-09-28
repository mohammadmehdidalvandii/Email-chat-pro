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
import type { AxiosProgressEvent } from 'axios'

/**
 * Uploads a single file via the backend's `/files/upload` endpoint.
 *
 * `formData` must include `file` and `type` (`'image'|'video'`).
 * Returns `FileUploadResponse` (shared contract with `{ url: string }`).
 * Throws `ApiRequestError` on failure.
 *
 * No `Content-Type` is set here on purpose: Axios derives the multipart
 * header (including the boundary token) from the `FormData` body. Setting it
 * manually strips the boundary and the backend's Multer interceptor cannot
 * parse the part.
 *
 * `onUploadProgress` is optional and only used to drive the upload progress
 * indicator; the backend has no separate progress endpoint to poll.
 */
export async function uploadFileApi(
  formData: FormData,
  onUploadProgress?: (percent: number) => void,
): Promise<FileUploadResponse> {
  return apiRequest<FileUploadResponse>({
    method: 'POST',
    url: '/files/upload',
    data: formData,
    onUploadProgress: onUploadProgress
      ? (event: AxiosProgressEvent) => {
          if (!event.total) return
          onUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      : undefined,
  })
}
