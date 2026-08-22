import { CmsImage } from '@/components/ui/CmsImage'
import type { HomePageVM } from '@/types/content'

import { SearchWidget } from './SearchWidget'

export const Hero = ({ hero }: { hero: HomePageVM['hero'] }) => (
  <section className="relative flex h-[90vh] min-h-[700px] w-full items-center justify-center">
    <div className="absolute inset-0">
      <CmsImage image={hero.image} alt="" sizes="100vw" priority />
    </div>
    <div
      aria-hidden
      className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"
    />

    <div className="relative z-10 mx-auto mt-[-10vh] flex w-full max-w-7xl flex-col items-center px-6 md:px-grid-margin">
      <h1 className="mb-6 max-w-5xl text-center font-display-hero text-display-hero-mobile leading-[1.1] text-white drop-shadow-lg md:text-[80px]">
        {hero.title}
      </h1>
      {hero.subtitle ? (
        <p className="mb-12 max-w-2xl text-center font-body-lg text-body-lg text-white/90">
          {hero.subtitle}
        </p>
      ) : null}
    </div>

    <div className="absolute bottom-0 left-0 z-20 w-full translate-y-1/2 px-4">
      <SearchWidget defaultDestination={hero.defaultDestination} />
    </div>
  </section>
)
