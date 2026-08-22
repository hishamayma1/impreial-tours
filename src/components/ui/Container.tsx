import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ContainerProps = ComponentPropsWithoutRef<'div'> & {
  as?: ElementType
  size?: 'default' | 'narrow' | 'wide'
  children: ReactNode
}

const sizes = {
  narrow: 'max-w-4xl',
  default: 'max-w-7xl',
  wide: 'max-w-[1600px]',
}

export const Container = ({
  as: Tag = 'div',
  size = 'default',
  className,
  children,
  ...rest
}: ContainerProps) => (
  <Tag className={cn('mx-auto w-full px-6 md:px-grid-margin', sizes[size], className)} {...rest}>
    {children}
  </Tag>
)
