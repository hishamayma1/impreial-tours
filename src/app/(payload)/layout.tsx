import type { ServerFunctionClient } from 'payload'
import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import { Inter, Playfair_Display } from 'next/font/google'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

/**
 * The website's own typefaces, so the dashboard reads as Imperial Tours: Playfair
 * Display for headings, Inter for everything else. Same subsets and weights as the
 * site's layout, so the browser reuses the cached files between the two.
 */
const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
})

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

/**
 * Payload's RootLayout renders <html> itself, so the fonts' className cannot be
 * attached to it. Their family names are published as custom properties on :root
 * instead — which also reaches drawers and popups Payload portals to <body>.
 * `--font-body` is Payload's own variable, so its whole UI switches to Inter.
 */
const fontVariables = `:root{--font-body:${body.style.fontFamily};--it-font-display:${display.style.fontFamily};}`

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    <style>{fontVariables}</style>
    {children}
  </RootLayout>
)

export default Layout
