'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
import { SectionCta } from '@/components/ui/SectionCta'
import type { SectionHeadingVM, TestimonialVM } from '@/types/content'
import { cn, firstFilled } from '@/lib/utils'

type TestimonialsProps = {
  heading: SectionHeadingVM
  testimonials: TestimonialVM[]
}

export const Testimonials = ({ heading, testimonials }: TestimonialsProps) => {
  const t = useTranslations('testimonials')
  const [index, setIndex] = useState(0)

  if (testimonials.length === 0) return null

  const active = testimonials[Math.min(index, testimonials.length - 1)]

  return (
    <section
      className="relative overflow-hidden bg-brand py-16 md:py-section-v-padding"
      aria-labelledby="testimonials-heading"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 top-2 select-none font-display-hero text-[120px] leading-none text-white/5 md:left-8 md:top-4 md:text-[200px]"
      >
        &ldquo;
      </span>

      <Container size="narrow" className="relative z-10 text-center">
        <span className="mb-6 block font-label-caps md:mb-8 text-label-caps uppercase tracking-widest text-inverse-primary">
          {firstFilled(heading.eyebrow, t('eyebrow'))}
        </span>

        {/*
          The band is labelled by a real heading rather than by the blockquote it used
          to point at: aria-labelledby on a quote made the section's accessible name the
          entire testimonial, and left the page outline with no h2 between Destinations
          and Journal. The design shows no visible title here, so it is screen-reader only.
        */}
        <h2 id="testimonials-heading" className="sr-only">
          {firstFilled(heading.title, t('title'))}
        </h2>

        <figure>
          <blockquote className="mb-8 md:mb-12">
            <p className="font-headline-section text-[22px] leading-snug text-white sm:text-[28px] sm:leading-tight md:text-[40px]">
              &ldquo;{active.quote}&rdquo;
            </p>
          </blockquote>

          <figcaption className="flex flex-col items-center">
            <span className="relative mb-4 block h-16 w-16 overflow-hidden rounded-full bg-surface-container-low">
              <CmsImage image={active.portrait} alt={active.author} sizes="64px" />
            </span>
            <p className="font-headline-card text-lg text-white">{active.author}</p>
            {active.location ? (
              <p className="font-caption text-caption text-inverse-primary">{active.location}</p>
            ) : null}
          </figcaption>
        </figure>

        {/*
          The strongest point on the page to ask: the visitor has just read someone
          else vouching for the trip. Light tone, because this band is navy.
        */}
        <SectionCta
          tone="light"
          primary={{ label: t('ctaPrimary'), href: '#plan' }}
          secondary={{ label: t('ctaSecondary'), href: '/tours/experiences' }}
          className="mt-8 md:mt-12"
        />

        {testimonials.length > 1 ? (
          <div className="mt-8 flex justify-center gap-1 md:mt-10">
            {testimonials.map((testimonial, dotIndex) => (
              <button
                key={testimonial.id}
                type="button"
                onClick={() => setIndex(dotIndex)}
                aria-label={t('goTo', { index: dotIndex + 1 })}
                aria-current={dotIndex === index}
                // A 12px dot is too small to hit with a thumb, so the tap area is
                // padded out to 32px around it while the dot itself stays small.
                className="group/dot flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  aria-hidden
                  className={cn(
                    'block h-3 w-3 rounded-full transition-colors',
                    dotIndex === index ? 'bg-white' : 'bg-white/30 group-hover/dot:bg-white/60',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
