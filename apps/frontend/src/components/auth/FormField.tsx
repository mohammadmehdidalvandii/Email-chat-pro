/**
 * FormField — shared label + input + error row for the auth forms.
 *
 * Keeps the register/login/verify-email forms DRY and visually consistent.
 * Wires React Hook Form's `register` result through, surfacing the field-level
 * error message inline. Error text is localized by the caller via the
 * translation keys passed in.
 */
import type { ReactNode } from 'react'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export interface FormFieldProps {
  id: string
  label: string
  /** Returned by `register(...)`. */
  registration: UseFormRegisterReturn
  error?: FieldError
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  /** Optional hint rendered below the input when there is no error. */
  hint?: ReactNode
}

export function FormField({
  id,
  label,
  registration,
  error,
  type = 'text',
  autoComplete,
  dir,
  hint,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        dir={dir}
        aria-invalid={Boolean(error)}
        {...registration}
      />
      {error ? (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {error.message}
        </p>
      ) : (
        hint && <p className="text-sm text-neutral-500">{hint}</p>
      )}
    </div>
  )
}
