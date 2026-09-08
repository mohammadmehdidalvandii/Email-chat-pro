import { IsNotEmpty, IsString } from 'class-validator'

/**
 * DTO for DELETE /users/me (Task 1.5 — Account Deletion).
 * Requires the user's current password for explicit confirmation
 * (features.md — "Deletion requires explicit confirmation").
 */
export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty()
  password!: string
}
