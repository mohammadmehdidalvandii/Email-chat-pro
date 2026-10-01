/**
 * File upload API (architecture.md §File Endpoints).
 *
 * Posts multipart/form-data to the backend's file upload endpoint
 * (`POST /files/upload`). Uses the shared `apiRequest` wrapper so
 * the response envelope is normalized and the JWT Bearer token is
 * attached via the `apiClient` interceptor automatically.
 */
import { VIDEO_MAX_SIZE_BYTES } from '@email-chat-pro/constants'
import { apiRequest } from './client'
import type { FileUploadResponse } from '@email-chat-pro/types'
import type { AxiosProgressEvent } from 'axios'

/**
 * Upload-only timeout, in ms.
 *
 * The shared Axios default is 15s, which is right for JSON calls but far too
 * short here: the backend accepts videos up to VIDEO_MAX_SIZE_BYTES (50MB),
 * and on an ordinary connection a file that size needs well over 15s to
 * transfer — Axios would abort a request the server was willing to accept,
 * losing the upload and one of the endpoint's five hourly attempts.
 *
 * Sized from the largest file the backend accepts (VIDEO_MAX_SIZE_BYTES), not
 * from a round number, so the two limits cannot drift apart. The extra
 * headroom covers the server's own Cloudinary processing after the body lands.
 * Only the upload request carries this; every other request keeps the 15s
 * default.
 */
const UPLOAD_TIMEOUT_MS = (VIDEO_MAX_SIZE_BYTES / (1024 * 1024)) * 60_000

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
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: onUploadProgress
      ? (event: AxiosProgressEvent) => {
          if (!event.total) return
          onUploadProgress(Math.round((event.loaded / event.total) * 100))
        }
      : undefined,
  })
}
