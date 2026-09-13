/**
 * Shared by run.ts and restore-media.ts — both download the same `assets.json` URLs
 * into Media documents and need to agree on how a response becomes a file.
 */

/**
 * Wikimedia's edge blocks or rate-limits requests that carry no descriptive
 * User-Agent — required by their own API etiquette policy for any automated client.
 * Node's bare `fetch` sends a generic one and gets a 429 for it.
 */
export const SEED_USER_AGENT =
  'ImperialToursSeed/1.0 (https://github.com/imperial-tours; seed script fetching Commons demo imagery)'

/**
 * A file extension for a downloaded asset, from the response's own `content-type`.
 *
 * Every current asset is a photograph or the one SVG logo, but the mapping stays
 * exhaustive rather than defaulting non-matches to `jpg`: a source that responds
 * `image/svg+xml` and gets named `logo.jpg` is XML markup wearing a raster
 * extension — Payload accepts the upload (`mimeTypes: ['image/*']` doesn't check the
 * name), so the corruption stays invisible until a browser tries to decode "the JPEG"
 * and fails.
 */
export const extensionFor = (contentType: string): string => {
  if (contentType.includes('svg')) return 'svg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  return 'jpg'
}
