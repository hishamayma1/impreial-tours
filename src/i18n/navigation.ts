import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware drop-in replacements for next/link and the router hooks.
 * Always import Link/redirect/usePathname/useRouter from here, never from `next/*`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
