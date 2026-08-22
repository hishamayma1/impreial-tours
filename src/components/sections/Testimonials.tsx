'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { CmsImage } from '@/components/ui/CmsImage'
import { Container } from '@/components/ui/Container'
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
      className="relative overflow-hidden bg-brand py-section-v-padding"
      aria-labelledby="testimonials-heading"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-8 top-4 select-none font-display-hero text-[200px] leading-none text-white/5"
      >
        &ldquo;
      </span>

      <Container size="narrow" className="relative z-10 text-center">
        <span className="mb-8 block font-label-caps text-label-caps uppercase tracking-widest text-inverse-primary">
          {firstFilled(heading.eyebrow, t('eyebrow'))}
        </span>

        <blockquote id="testimonials-heading" className="mb-12">
          <p className="font-headline-section text-[28px] leading-tight text-white md:text-[40px]">
            &ldquo;{active.quote}&rdquo;
          </p>
        </blockquote>

        <figcaption className="flex flex-col items-center">
          <span className="mb-4 block h-16 w-16 overflow-hidden rounded-full bg-surface-container-low">
            <CmsImage image={active.portrait} alt={active.author} sizes="64px" />
          </span>
          <p className="font-headline-card text-lg text-white">{active.author}</p>
          {active.location ? (
            <p className="font-caption text-caption text-inverse-primary">{active.location}</p>
          ) : null}
        </figcaption>

        {testimonials.length > 1 ? (
          <div className="mt-8 flex justify-center gap-2">
            {testimonials.map((testimonial, dotIndex) => (
              <button
                key={testimonial.id}
                type="button"
                onClick={() => setIndex(dotIndex)}
                aria-label={t('goTo', { index: dotIndex + 1 })}
                aria-current={dotIndex === index}
                className={cn(
                  'h-3 w-3 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  dotIndex === index ? 'bg-white' : 'bg-white/30 hover:bg-white/60',
                )}
              />
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  )
}
