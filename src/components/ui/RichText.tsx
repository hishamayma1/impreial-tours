import { RichText as LexicalRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { cn } from '@/lib/utils'

/**
 * Renders a Payload Lexical field. Typography is applied by the wrapper rather than by
 * a plugin so the CMS output inherits the design's own scale.
 */
export const RichText = ({ data, className }: { data: unknown; className?: string }) => {
  if (!data) return null

  return (
    <div
      className={cn(
        'space-y-4 font-body-md text-body-md leading-relaxed text-on-surface-variant [&_a]:text-brand [&_a]:underline [&_h2]:font-headline-card [&_h2]:text-headline-card [&_h2]:text-primary [&_h3]:font-headline-card [&_h3]:text-primary [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:text-primary [&_ul]:list-disc',
        className,
      )}
    >
      <LexicalRichText data={data as SerializedEditorState} />
    </div>
  )
}
