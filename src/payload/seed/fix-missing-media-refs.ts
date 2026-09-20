import { getPayload } from 'payload'
import config from '../../payload.config'
import { SEED_USER_AGENT, extensionFor } from './fetch-asset'

/**
 * One-off repair for a single deleted Media document (id 6a8c3742b8aff260fe2c15d5)
 * that turned out to be reused, unchanged, as the placeholder image across most of
 * the site: the nav logo, the home page hero, three hotels and three (pre-demo-seed)
 * bicycles all pointed at that one id. Once it was gone every one of those went blank
 * with no error, because a dangling relationship id just resolves to nothing rather
 * than failing the query.
 *
 * Each target gets its own distinct Commons photo rather than all sharing a second
 * placeholder, since the sites they sit on (a hotel page, a bicycle card) have their
 * own alt text and are worth a real, if temporary, photo instead of another shared
 * stand-in. `logo` and `heroHome` reuse the exact sources already vetted for those
 * roles in assets.json (the pyramid icon and the Sphinx/pyramid panorama) rather than
 * inventing new ones for slots that already had a considered choice.
 */

const MISSING_ID = '6a8c3742b8aff260fe2c15d5'

type Target = {
  key: string
  url: string
  alt: string
  credit: string
  apply: (payload: Awaited<ReturnType<typeof getPayload>>, mediaId: string) => Promise<void>
}

const targets: Target[] = [
  {
    key: 'logo',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Noun_Project_Pyramids_of_Giza_icon_2956391.svg',
    alt: 'Imperial Tours pyramid icon',
    credit: 'Noun Project (Wikimedia Commons)',
    apply: async (payload, id) => {
      await payload.updateGlobal({ slug: 'site-settings', data: { logo: id } })
    },
  },
  {
    key: 'home-hero',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sphinx_and_the_Great_Pyramid_of_Giza_panorama.jpg',
    alt: 'The Sphinx and the Great Pyramid of Giza at sunset',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      const home = (await payload.findGlobal({ slug: 'home-page', depth: 0 })) as any
      await payload.updateGlobal({
        slug: 'home-page',
        data: { hero: { ...home.hero, image: id }, _status: 'published' },
      })
    },
  },
  {
    key: 'hotel-west-bank-courtyard-house',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nubian_house_in_the_bank_of_River_Nile_Aswan_,_Egypt.JPG',
    alt: 'A traditional Nubian house on the riverbank near Aswan',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'hotels',
        where: { slug: { equals: 'west-bank-courtyard-house' } },
        data: { heroImage: id, _status: 'published' },
      })
    },
  },
  {
    key: 'hotel-old-cataract-terrace',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hotel_Tower,_The_Old_Cataract_Hotel,_Aswan,_AG,_EGY_(48025405123).jpg',
    alt: 'The Old Cataract Hotel tower overlooking the Nile in Aswan',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'hotels',
        where: { slug: { equals: 'old-cataract-terrace' } },
        data: { heroImage: id, _status: 'published' },
      })
    },
  },
  {
    key: 'hotel-mena-house-gardens',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Oberoi_-_Mena_House,_Egypt.jpg',
    alt: 'Mena House gardens with the Giza pyramids behind',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'hotels',
        where: { slug: { equals: 'mena-house-gardens' } },
        data: { heroImage: id, _status: 'published' },
      })
    },
  },
  {
    key: 'bicycle-pyramid-fields-by-bicycle',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cycling_tourist_with_racks_and_panniers_riding_on_a_gravel_road.jpg',
    alt: 'A cyclist riding a touring bicycle on a gravel desert road',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'bicycles',
        where: { slug: { equals: 'pyramid-fields-by-bicycle' } },
        data: { image: id, _status: 'published' },
      })
    },
  },
  {
    key: 'bicycle-electric-trail-bike',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Beryl_Electric_Bike.jpg',
    alt: 'An electric trail bicycle',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'bicycles',
        where: { slug: { equals: 'electric-trail-bike' } },
        data: { image: id, _status: 'published' },
      })
    },
  },
  {
    key: 'bicycle-city-cruiser',
    url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nishiki_207_city_hybrid_bike.jpg',
    alt: 'A city cruiser bicycle',
    credit: 'Wikimedia Commons',
    apply: async (payload, id) => {
      await payload.update({
        collection: 'bicycles',
        where: { slug: { equals: 'city-cruiser' } },
        data: { image: id, _status: 'published' },
      })
    },
  },
]

const run = async () => {
  const payload = await getPayload({ config })
  payload.logger.info(`--- repairing ${targets.length} references to deleted media ${MISSING_ID} ---`)

  for (const target of targets) {
    try {
      const response = await fetch(target.url, { headers: { 'User-Agent': SEED_USER_AGENT } })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType = response.headers.get('content-type') ?? 'image/jpeg'
      const extension = extensionFor(contentType)
      const filename = `${target.key}.${extension}`

      const media = await payload.create({
        collection: 'media',
        data: { alt: target.alt, credit: target.credit },
        file: { data: buffer, mimetype: contentType, name: filename, size: buffer.byteLength },
      })

      await target.apply(payload, String(media.id))

      payload.logger.info(`  ${target.key}: uploaded ${filename} -> ${media.id}`)
    } catch (error) {
      payload.logger.error(`  ${target.key} failed: ${(error as Error).message}`)
    }
  }

  payload.logger.info('Done.')
  process.exit(0)
}

await run()
