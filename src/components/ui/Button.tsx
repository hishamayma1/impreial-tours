import type { ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'navy' | 'outlineLight' | 'outlineNavy' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-body-md font-medium transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<ButtonVariant, string> = {
  navy: 'bg-brand text-white shadow-sm hover:bg-brand-light active:scale-95',
  outlineLight: 'border border-white text-white hover:bg-white hover:text-brand',
  outlineNavy: 'border border-brand text-brand hover:bg-brand hover:text-white',
  ghost: 'text-on-surface-variant hover:text-brand',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5',
  lg: 'px-8 py-4',
}

export const buttonStyles = ({
  variant = 'navy',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) =>
  cn(base, variants[variant], sizes[size], className)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = ({ variant, size, className, ...rest }: ButtonProps) => (
  <button className={buttonStyles({ variant, size, className })} {...rest} />
)

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Locale-aware CTA link that renders with button styling. */
export const ButtonLink = ({ variant, size, className, ...rest }: ButtonLinkProps) => (
  <Link className={buttonStyles({ variant, size, className })} {...rest} />
)
