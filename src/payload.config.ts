import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'

import { locales, defaultLocale, localeLabels } from './i18n/routing'

import { Users } from './payload/collections/Users'
import { Media } from './payload/collections/Media'
import { Categories } from './payload/collections/Categories'
import { Services } from './payload/collections/Services'
import { Offers } from './payload/collections/Offers'
import { Destinations } from './payload/collections/Destinations'
import { Testimonials } from './payload/collections/Testimonials'
import { Posts } from './payload/collections/Posts'
import { Bookings } from './payload/collections/Bookings'

import { emailAdapter } from './payload/email'
import { Header } from './payload/globals/Header'
import { Footer } from './payload/globals/Footer'
import { HomePage } from './payload/globals/HomePage'
import { SiteSettings } from './payload/globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Imperial Tours',
    },
    components: {},
  },

  /**
   * Content localization mirrors the front-end routing config exactly, so adding a
   * language is a one-line change in src/i18n/routing.ts.
   */
  localization: {
    locales: locales.map((code) => ({
      code,
      label: localeLabels[code].label,
    })),
    defaultLocale,
    fallback: true,
  },

  collections: [
    Services,
    Offers,
    Destinations,
    Testimonials,
    Posts,
    Categories,
    Bookings,
    Media,
    Users,
  ],
  globals: [HomePage, Header, Footer, SiteSettings],

  editor: lexicalEditor(),
  email: emailAdapter,
  secret: process.env.PAYLOAD_SECRET || '',
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
    connectOptions: {
      maxPoolSize: 20,
    },
  }),
  sharp,

  typescript: {
    outputFile: path.resolve(dirname, 'types/payload-types.ts'),
  },
  graphQL: {
    schemaOutputFile: path.resolve(dirname, '..', 'schema.graphql'),
  },

  cors: [serverURL],
  csrf: [serverURL],
})
