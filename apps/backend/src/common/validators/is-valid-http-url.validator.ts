import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator'
import { isValidHttpUrl } from '@email-chat-pro/utils'

/**
 * `@IsValidHttpUrl()` — accepts only absolute `http:`/`https:` URLs.
 *
 * Delegates to the shared `isValidHttpUrl` in packages/utils, which is the same
 * predicate the media-URL rules in messages.service already use, so client-
 * supplied URL fields are judged by one implementation.
 *
 * `null`/`undefined` pass: absence is handled by `@IsOptional`, so an omitted or
 * explicitly nulled field must not be reported as an invalid URL.
 */
export function IsValidHttpUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isValidHttpUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value === null || value === undefined) {
            return true
          }
          return typeof value === 'string' && isValidHttpUrl(value)
        },
        defaultMessage(args: ValidationArguments): string {
          return args.constraints[0] ?? 'value must be a valid http(s) URL'
        },
      },
    })
  }
}
