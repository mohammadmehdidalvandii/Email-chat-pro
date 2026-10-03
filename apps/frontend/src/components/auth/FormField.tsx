/**
 * FormField — shared label + input + error row for the auth and profile forms.
 *
 * Keeps the register/login/verify-email/profile forms DRY and visually
 * consistent. Wires React Hook Form's `register` result through, surfacing the
 * field-level error message inline. Schemas emit `validation:` keys as the
 * message, so the text is resolved through {@link validationMessage} here and
 * re-resolves when the active language changes.
 *
 * Password fields can opt into a visibility toggle (`showPasswordToggle`).
 * The toggle only switches the input's `type`; React Hook Form owns the
 * value, so showing or hiding the password never resets or modifies it.
 */
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { validationMessage } from '../../i18n/validation'
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
  /**
   * Renders a show/hide control next to a password input. Opt-in so the
   * profile forms (text/email fields) are unaffected.
   */
  showPasswordToggle?: boolean
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
  showPasswordToggle = false,
}: FormFieldProps) {
  const { t } = useTranslation('auth', { useSuspense: false })
  const [passwordVisible, setPasswordVisible] = useState(false)

  const toggleLabel = passwordVisible
    ? t('hidePassword')
    : t('showPassword')

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {showPasswordToggle && type === 'password' ? (
        <div className="relative">
          <Input
            id={id}
            type={passwordVisible ? 'text' : 'password'}
            autoComplete={autoComplete}
            dir={dir}
            aria-invalid={Boolean(error)}
            className="pr-10"
            {...registration}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={toggleLabel}
            title={toggleLabel}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500 hover:text-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {passwordVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      ) : (
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          dir={dir}
          aria-invalid={Boolean(error)}
          {...registration}
        />
      )}
      {error ? (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {validationMessage(error.message)}
        </p>
      ) : (
        hint && <p className="text-sm text-neutral-500">{hint}</p>
      )}
    </div>
  )
}
