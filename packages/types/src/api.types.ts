/**
 * Shared API response contracts.
 *
 * Single source of truth for frontend and backend, per architecture.md
 * (`packages/types/api.types.ts`). Do not redefine these shapes in either app.
 */

/** Error details attached to a failed API response. */
export interface ApiError {
  code: string
  message: string
}

/** Standard successful/failed API response envelope. */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

/** Pagination metadata. */
export interface Pagination {
  total: number
  page: number
  limit: number
  pages: number
}

/** Standard paginated API response envelope. */
export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
  timestamp: string
}
