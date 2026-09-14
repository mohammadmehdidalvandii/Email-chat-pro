/**
 * Cloudinary configuration (rules.md §Secrets & Environment; stack.md — File
 * Storage: Cloudinary).
 *
 * Cloudinary is the approved media infrastructure (Task 4.1). Its credentials
 * come exclusively from the environment and must never be hard-coded or
 * committed. They are read lazily at the first upload (FilesService), not at
 * app boot, so the rest of the API runs without a Cloudinary account until
 * media is actually uploaded (see current-task.md Task 4.1, decision 3).
 *
 * The variable names match the committed `apps/backend/.env.example`
 * (`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`)
 * and the Cloudinary SDK's own `cloudinary.config({ cloud_name, api_key,
 * api_secret })` keys (Task 0.1 known issue — the naming discrepancy against
 * stack.md §25 is resolved in favor of the committed `.env.example` contract).
 */

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary environment variables are required: ' +
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
    )
  }

  return { cloudName, apiKey, apiSecret }
}
