/**
 * Input primitive (shadcn/ui convention).
 */
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm',
          'text-neutral-900 placeholder:text-neutral-400',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-[invalid=true]:border-red-500',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
