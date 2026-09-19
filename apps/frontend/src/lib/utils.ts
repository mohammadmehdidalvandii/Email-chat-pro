/**
 * Class name helper for UI primitives.
 *
 * A minimal conditional joiner (the project does not pull in `clsx` /
 * `tailwind-merge`, which are not in stack.md). Sufficient for the small,
 * hand-authored shadcn-style primitives in this phase; components accept an
 * optional `className` and append it last so callers can override spacing.
 */
export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
