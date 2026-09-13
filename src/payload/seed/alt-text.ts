/**
 * English alt text for the seeded imagery. Media.alt is localized, so Spanish and
 * German fall back to these until an editor translates them in the dashboard.
 *
 * Written to describe the actual Wikimedia Commons photograph behind each key (see
 * assets.json) — alt text that describes a different image than the one on screen is
 * worse than none, since it actively misleads a screen reader user about what they're
 * looking at.
 */
export const altText: Record<string, string> = {
  logo: 'A stylised pyramid emblem',
  hero: 'The Great Sphinx and the Great Pyramid of Giza seen together across the plateau',
  serviceMuseum: 'The interior of the Grand Egyptian Museum near the Giza plateau',
  serviceCollage: 'The great hypostyle hall of columns at Karnak Temple, Luxor',
  serviceHotel: 'An infinity pool overlooking the Nile at a Luxor resort',
  serviceBikes: 'A cyclist with panniers riding a loaded touring bicycle on a gravel road',
  offerDahabiya: 'A traditional dahabeah sailing boat on the Nile',
  offerSahara: 'Wind-carved chalk formations in Egypt’s White Desert at dusk',
  offerLuxor: 'Sunset over the Nile River at Luxor',
  destCairo: 'A panoramic view of the Cairo skyline along the Nile',
  destLuxor: 'Luxor Temple illuminated at night',
  destAswan: 'Traditional feluccas sailing the Nile at Aswan',
  portrait: 'A couple sitting together watching the sunset',
  journalDesert: 'Rock formations in the White Desert landscape, Egypt',
  journalMask: 'The gold funerary mask of Tutankhamun',
  journalNile: 'A felucca under sail on the Nile',
  destinationGiza: 'The Great Sphinx and the Great Pyramid of Giza seen together across the plateau',
  destinationLuxor: 'Luxor Temple on the banks of the Nile',
  destinationAswan: 'Traditional feluccas sailing the Nile at Aswan',
  offerDesert: 'Rock formations in the White Desert landscape, Egypt',
  offerNileCruise: 'A traditional dahabeah sailing boat on the Nile',
  offerRedSea: 'A diver among fish at a Red Sea coral reef',
}
