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
import type { ApiError, ApiResponse } from '@email-chat-pro/types'
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

/** Shared Axios instance. */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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
 */
export function toApiRequestError(error: unknown): ApiRequestError {
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
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<ApiResponse<T>>(config)
    if (!response.data.success || response.data.data === undefined) {
      // The envelope says failure but Axios still resolved (e.g. 2xx with
      // success:false). Treat it as an internal error so it is never silent.
      throw {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: response.data.error?.message ?? ERROR_MESSAGES.INTERNAL,
        status: response.status,
      } satisfies ApiRequestError
    }
    return response.data.data
  } catch (error) {
    throw toApiRequestError(error)
  }
}
