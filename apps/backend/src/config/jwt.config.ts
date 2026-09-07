/**
 * JWT signing configuration (rules.md §Secrets & Environment).
 *
 * The secret must come from the environment — it is an application secret and
 * must never be hard-coded or committed. The app does not auto-load `.env`
 * (no dotenv/ConfigModule in the approved stack), so `JWT_SECRET` must be
 * exported at runtime. If it is missing the application refuses to boot rather
 * than silently signing tokens with a weak default.
 */

export interface JwtConfig {
  secret: string
  expiresIn: string
}

export function getJwtConfig(): JwtConfig {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is required')
  }
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '30d'
  return { secret, expiresIn }
}
