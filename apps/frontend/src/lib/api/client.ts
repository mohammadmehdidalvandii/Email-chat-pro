/**
 * Axios HTTP client (architecture.md §Axios — REST API communication).
 *
 * A single instance is shared by every API hook/mutation so request config
 * (base URL, timeout, auth header) stays centralized. The backend sets an
 * httpOnly cookie at login, but local development runs the frontend and backend
 * on separate ports (3000/4000) with CORS that does not include `credentials`,
 * so the cookie cannot be relied on cross-origin. The JWT returned in the login
 * body is therefore attached as an `Authorization: Bearer` header from the auth
 * store instead. Backend authorization remains authoritative either way.
 */
import {
  API_BASE_PATH,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '@email-chat-pro/constants'
import type { ApiError, ApiResponse, PaginatedResponse } from '@email-chat-pro/types'
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { getAuthToken } from '../../stores/auth.store'

/** Base URL of the backend API (stack.md §Environment — NEXT_PUBLIC_API_URL). */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_BASE_PATH}`

/**
 * Shape of a failed API request surfaced to calling code. Mirrors the
 * backend's standardized error envelope (`{ success, error, timestamp }`)
 * reduced to just the fields the UI needs.
 */
export interface ApiRequestError {
  /** Backend error code (packages/constants ERROR_CODES), or a client-side fallback. */
  code: string
  /** Human-readable message; the backend's is used when available. */
  message: string
  /** HTTP status code, or 0 for network/timeout failures. */
  status: number
}

/** Sentinel for non-HTTP (network/canceled) failures. */
const NO_RESPONSE_STATUS = 0

/** Type guard for an error that already went through {@link toApiRequestError}. */
function isApiRequestError(error: unknown): error is ApiRequestError {
  if (typeof error !== 'object' || error === null) {
    return false
  }
  const { code, message, status } = error as Partial<ApiRequestError>
  return typeof code === 'string' && typeof message === 'string' && typeof status === 'number'
}

/**
 * Shared Axios instance. No default `Content-Type` is set: Axios must choose
 * the header itself so a `FormData` body keeps the multipart boundary the
 * backend's Multer interceptor needs.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

/**
 * Attaches the current JWT (if any) as a Bearer token. Read lazily from the
 * auth store so logout clears it without rebuilding the instance.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/**
 * Normalizes any Axios failure into a single `ApiRequestError` shape so hooks
 * and components never have to branch on Axios internals.
 *
 * Idempotent: an error that is already an `ApiRequestError` (thrown by
 * {@link apiRequest} rather than by Axios) is returned as-is, so wrapping a
 * normalized error never loses its real status or backend error code.
 */
export function toApiRequestError(error: unknown): ApiRequestError {
  if (isApiRequestError(error)) {
    return error
  }

  if (error instanceof AxiosError) {
    // No response => network error, timeout, or the server was unreachable.
    if (!error.response) {
      return {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Unable to reach the server. Check your connection and try again.',
        status: NO_RESPONSE_STATUS,
      }
    }

    const body = error.response.data as ApiResponse<unknown> | undefined
    const apiError = body?.error satisfies ApiError | undefined as ApiError | undefined
    return {
      code: apiError?.code ?? ERROR_CODES.INTERNAL_ERROR,
      message: apiError?.message ?? ERROR_MESSAGES.INTERNAL,
      status: error.response.status,
    }
  }

  return {
    code: ERROR_CODES.INTERNAL_ERROR,
    message: ERROR_MESSAGES.INTERNAL,
    status: NO_RESPONSE_STATUS,
  }
}

/**
 * Thin wrapper around `apiClient` that returns the `data` field of a successful
 * `ApiResponse<T>` and throws an `ApiRequestError` on failure. Hooks use this
 * so they can stay focused on the success shape, not the envelope.
 *
 * Note: `PaginatedResponse<T>` puts `pagination` as a SIBLING of `data`, so a
 * paginated route must use {@link apiPaginatedRequest} instead — this wrapper
 * would drop the page metadata.
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const { body, status } = await requestEnvelope<T>(config)
  if (body.data === undefined) {
    // The envelope says failure but Axios still resolved (e.g. 2xx with
    // success:false). Treat it as an internal error so it is never silent.
    throw {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: body.error?.message ?? ERROR_MESSAGES.INTERNAL,
      status,
    } satisfies ApiRequestError
  }
  return body.data
}

/**
 * Same as {@link apiRequest} but for the backend's paginated envelope, whose
 * `data` array and `pagination` block are siblings. Both are returned so the
 * UI can render page controls; the full shared `PaginatedResponse<T>` shape is
 * preserved rather than re-declared here.
 */
export async function apiPaginatedRequest<T>(
  config: AxiosRequestConfig,
): Promise<PaginatedResponse<T>> {
  const { body, status } = await requestEnvelope<T[]>(config)
  if (body.data === undefined || body.pagination === undefined) {
    throw {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: body.error?.message ?? ERROR_MESSAGES.INTERNAL,
      status,
    } satisfies ApiRequestError
  }
  return {
    success: body.success,
    data: body.data,
    pagination: body.pagination,
    timestamp: body.timestamp,
  }
}

/** A resolved success envelope plus its HTTP status, for error reporting. */
type Envelope<T> = ApiResponse<T> & Partial<PaginatedResponse<T>>

/**
 * Performs the request and returns the success envelope, normalizing any
 * failure into an `ApiRequestError`. Shared by the two wrappers above.
 */
async function requestEnvelope<T>(
  config: AxiosRequestConfig,
): Promise<{ body: Envelope<T>; status: number }> {
  try {
    const response = await apiClient.request<Envelope<T>>(config)
    return { body: response.data, status: response.status }
  } catch (error) {
    throw toApiRequestError(error)
  }
}
