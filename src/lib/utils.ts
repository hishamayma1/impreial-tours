import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** Returns the first non-empty string, so CMS copy can override an i18n default. */
export const firstFilled = (...values: Array<string | null | undefined>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return ''
}
