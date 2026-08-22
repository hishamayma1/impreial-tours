import Image from 'next/image'
import type { ImageVM } from '@/types/content'
import { cn } from '@/lib/utils'

type CmsImageProps = {
  image: ImageVM | null
  /** Falls back to the image's own alt text; pass '' for decorative images. */
  alt?: string
  sizes: string
  className?: string
  priority?: boolean
  fill?: boolean
}

/**
 * Renders an uploaded Media document, degrading to a neutral surface when an editor
 * has not attached one yet — an unpublished image should never break the layout.
 */
export const CmsImage = ({
  image,
  alt,
  sizes,
  className,
  priority = false,
  fill = true,
}: CmsImageProps) => {
  if (!image) {
    return (
      <div
        aria-hidden
        className={cn('h-full w-full bg-surface-container-high', className)}
      />
    )
  }

  if (!fill) {
    return (
      <Image
        src={image.url}
        alt={alt ?? image.alt}
        width={image.width ?? 1200}
        height={image.height ?? 800}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    )
  }

  return (
    <Image
      src={image.url}
      alt={alt ?? image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
    />
  )
}
