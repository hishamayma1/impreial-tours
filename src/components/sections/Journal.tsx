import { useFormatter } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { ButtonLink } from '@/components/ui/Button'
import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { SectionHeading } from '@/components/ui/SectionHeading'
import type { PostVM, SectionHeadingVM } from '@/types/content'

type JournalProps = {
  heading: SectionHeadingVM
  posts: PostVM[]
  readAllLabel: string
}

export const Journal = ({ heading, posts, readAllLabel }: JournalProps) => {
  const format = useFormatter()

  if (posts.length === 0) return null

  return (
    <Container as="section" className="py-section-v-padding" aria-labelledby="journal-heading">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          headingId="journal-heading"
          eyebrow={heading.eyebrow}
          title={heading.title}
          align="left"
        />
        <ButtonLink href="/journal" variant="outlineNavy" className="hidden md:inline-flex">
          {readAllLabel}
        </ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-grid-gutter md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article key={post.id} className="group">
            <Link
              href={`/journal/${post.slug}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-2xl"
            >
              <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl">
                <CmsImage
                  image={post.image}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <span className="mb-3 block font-label-caps text-xs uppercase tracking-widest text-on-surface-variant">
                {[post.category, format.dateTime(new Date(post.publishedAt), 'journal')]
                  .filter(Boolean)
                  .join(' \u2022 ')}
              </span>
              <h3 className="mb-3 font-headline-card text-xl text-primary transition-colors group-hover:text-brand">
                {post.title}
              </h3>
              <p className="line-clamp-2 font-body-md text-on-surface-variant">{post.excerpt}</p>
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-10 flex md:hidden">
        <ButtonLink href="/journal" variant="outlineNavy" className="w-full">
          {readAllLabel}
        </ButtonLink>
      </div>
    </Container>
  )
}
