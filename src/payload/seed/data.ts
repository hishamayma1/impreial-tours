import type { Locale } from '../../i18n/routing'

export type Translated<T> = Record<Locale, T>

export type SeedService = {
  asset: string
  icon: string
  href: string
  order: number
  copy: Translated<{ title: string; description: string }>
}

export type SeedOffer = {
  asset: string
  href: string
  order: number
  copy: Translated<{ title: string; badges: Array<{ text: string; tone: 'glass' | 'solid' }> }>
}

export type SeedDestination = {
  asset: string
  order: number
  copy: Translated<{ name: string; summary: string }>
}

export type SeedTestimonial = {
  asset: string
  author: string
  order: number
  copy: Translated<{ quote: string; location: string }>
}

export type SeedPost = {
  asset: string
  publishedAt: string
  copy: Translated<{ title: string; excerpt: string; category: string }>
}

export const services: SeedService[] = [
  {
    asset: 'serviceMuseum',
    icon: 'explore',
    href: '/tours/daily',
    order: 1,
    copy: {
      en: {
        title: 'Daily Tours',
        description:
          'Private day excursions to the Giza Plateau, Saqqara, and the Egyptian Museum.',
      },
      es: {
        title: 'Excursiones diarias',
        description:
          'Excursiones privadas de un día a la meseta de Guiza, Saqqara y el Museo Egipcio.',
      },
      de: {
        title: 'Tagestouren',
        description:
          'Private Tagesausfluege zum Gizeh-Plateau, nach Sakkara und ins Aegyptische Museum.',
      },
    },
  },
  {
    asset: 'serviceCollage',
    icon: 'all-inclusive',
    href: '/tours/experiences',
    order: 2,
    copy: {
      en: {
        title: 'Full Package Tours',
        description: 'All-inclusive multi-day journeys covering Cairo, Luxor, and Aswan.',
      },
      es: {
        title: 'Circuitos todo incluido',
        description: 'Viajes de varios días con todo incluido por El Cairo, Luxor y Asuán.',
      },
      de: {
        title: 'Komplettreisen',
        description: 'All-inclusive-Reisen ueber mehrere Tage durch Kairo, Luxor und Assuan.',
      },
    },
  },
  {
    asset: 'serviceHotel',
    icon: 'hotel',
    href: '/hotels',
    order: 3,
    copy: {
      en: {
        title: 'Hotel Reservations',
        description: "Stays at Egypt's most prestigious properties with Pyramid views.",
      },
      es: {
        title: 'Reservas de hotel',
        description: 'Estancias en los hoteles más prestigiosos de Egipto con vistas a las pirámides.',
      },
      de: {
        title: 'Hotelreservierungen',
        description: 'Aufenthalte in Aegyptens renommiertesten Haeusern mit Blick auf die Pyramiden.',
      },
    },
  },
  {
    // Transfers is one of the four service families in the nav and in
    // SiteSettings.enabledServices, but the home page had no card for it.
    asset: 'destCairo',
    icon: 'transfer',
    href: '/transfers',
    order: 4,
    copy: {
      en: {
        title: 'Transfers',
        description:
          'Airport meet-and-greet, city-to-city road transfers, and custom routes with a private driver.',
      },
      es: {
        title: 'Traslados',
        description:
          'Recepción en el aeropuerto, traslados por carretera entre ciudades y rutas a medida con chófer privado.',
      },
      de: {
        title: 'Transfers',
        description:
          'Empfang am Flughafen, Ueberlandtransfers zwischen Staedten und individuelle Routen mit privatem Fahrer.',
      },
    },
  },
  {
    asset: 'serviceBikes',
    icon: 'bike',
    href: '/bicycles',
    order: 5,
    copy: {
      en: {
        title: 'Bicycle Reservations',
        description: 'Premium cycling tours through rural Egyptian paths and historic sites.',
      },
      es: {
        title: 'Reservas de bicicleta',
        description: 'Rutas ciclistas premium por caminos rurales egipcios y enclaves históricos.',
      },
      de: {
        title: 'Fahrradreservierungen',
        description: 'Premium-Radtouren ueber laendliche aegyptische Wege und zu historischen Staetten.',
      },
    },
  },
]

export const offers: SeedOffer[] = [
  {
    asset: 'offerDahabiya',
    href: '/tours/experiences',
    order: 1,
    copy: {
      en: {
        title: "The Pharaohs' Private Voyage",
        badges: [
          { text: '7-Day All-Inclusive', tone: 'glass' },
          { text: 'Save 15% for Winter Bookings', tone: 'solid' },
        ],
      },
      es: {
        title: 'El viaje privado de los faraones',
        badges: [
          { text: '7 días todo incluido', tone: 'glass' },
          { text: '15% de descuento en invierno', tone: 'solid' },
        ],
      },
      de: {
        title: 'Die private Reise der Pharaonen',
        badges: [
          { text: '7 Tage all-inclusive', tone: 'glass' },
          { text: '15% Rabatt fuer Winterbuchungen', tone: 'solid' },
        ],
      },
    },
  },
  {
    asset: 'offerSahara',
    href: '/tours/experiences',
    order: 2,
    copy: {
      en: {
        title: 'Sahara Twilight Retreat',
        badges: [
          { text: '4-Day Private Expedition', tone: 'glass' },
          { text: 'Save 10% for Early Bookings', tone: 'solid' },
        ],
      },
      es: {
        title: 'Retiro al atardecer en el Sáhara',
        badges: [
          { text: 'Expedición privada de 4 días', tone: 'glass' },
          { text: '10% por reserva anticipada', tone: 'solid' },
        ],
      },
      de: {
        title: 'Sahara-Daemmerungsretreat',
        badges: [
          { text: '4-taegige Privatexpedition', tone: 'glass' },
          { text: '10% Rabatt bei Fruehbuchung', tone: 'solid' },
        ],
      },
    },
  },
  {
    asset: 'offerLuxor',
    href: '/tours/experiences',
    order: 3,
    copy: {
      en: {
        title: 'Eternal Luxor Sunrise',
        badges: [
          { text: '3-Day Cultural Immersion', tone: 'glass' },
          { text: 'Exclusive Member Rate', tone: 'solid' },
        ],
      },
      es: {
        title: 'Amanecer eterno en Luxor',
        badges: [
          { text: 'Inmersión cultural de 3 días', tone: 'glass' },
          { text: 'Tarifa exclusiva para socios', tone: 'solid' },
        ],
      },
      de: {
        title: 'Ewiger Sonnenaufgang in Luxor',
        badges: [
          { text: '3 Tage Kultureintauchen', tone: 'glass' },
          { text: 'Exklusiver Mitgliederpreis', tone: 'solid' },
        ],
      },
    },
  },
]

export const destinations: SeedDestination[] = [
  {
    asset: 'destCairo',
    order: 1,
    copy: {
      en: { name: 'Cairo', summary: 'The Giza Plateau, Coptic Cairo and the Grand Egyptian Museum.' },
      es: { name: 'El Cairo', summary: 'La meseta de Guiza, el Cairo copto y el Gran Museo Egipcio.' },
      de: { name: 'Kairo', summary: 'Das Gizeh-Plateau, das koptische Kairo und das Grosse Aegyptische Museum.' },
    },
  },
  {
    asset: 'destLuxor',
    order: 2,
    copy: {
      en: { name: 'Luxor', summary: 'Karnak at first light and the Valley of the Kings by private guide.' },
      es: { name: 'Luxor', summary: 'Karnak al amanecer y el Valle de los Reyes con guía privado.' },
      de: { name: 'Luxor', summary: 'Karnak im ersten Licht und das Tal der Koenige mit privatem Guide.' },
    },
  },
  {
    asset: 'destAswan',
    order: 3,
    copy: {
      en: { name: 'Aswan', summary: 'Nubian villages, Philae temple and a dahabiya moored at sunset.' },
      es: { name: 'Asuán', summary: 'Pueblos nubios, el templo de File y una dahabiya al atardecer.' },
      de: { name: 'Assuan', summary: 'Nubische Doerfer, der Philae-Tempel und eine Dahabiya bei Sonnenuntergang.' },
    },
  },
]

export const testimonials: SeedTestimonial[] = [
  {
    asset: 'portrait',
    author: 'James & Eleanor Sterling',
    order: 1,
    copy: {
      en: {
        quote:
          'An absolutely flawless experience from start to finish. The attention to detail in our Egypt itinerary was simply unmatched. Imperial Tours redefined luxury travel for us.',
        location: 'London, UK',
      },
      es: {
        quote:
          'Una experiencia absolutamente impecable de principio a fin. La atención al detalle de nuestro itinerario por Egipto fue insuperable. Imperial Tours redefinió para nosotros el viaje de lujo.',
        location: 'Londres, Reino Unido',
      },
      de: {
        quote:
          'Eine von Anfang bis Ende makellose Erfahrung. Die Liebe zum Detail in unserer Aegypten-Reiseroute war unuebertroffen. Imperial Tours hat Luxusreisen fuer uns neu definiert.',
        location: 'London, Grossbritannien',
      },
    },
  },
]

export const posts: SeedPost[] = [
  {
    asset: 'journalDesert',
    publishedAt: '2024-10-12T09:00:00.000Z',
    copy: {
      en: {
        title: 'A Night under the Stars in the White Desert',
        excerpt:
          'Discover the secret camps, private chefs and silent dunes reserved for those in the know.',
        category: 'Cultural Immersion',
      },
      es: {
        title: 'Una noche bajo las estrellas en el Desierto Blanco',
        excerpt:
          'Descubre los campamentos secretos, los chefs privados y las dunas silenciosas reservadas a unos pocos.',
        category: 'Inmersión cultural',
      },
      de: {
        title: 'Eine Nacht unter den Sternen der Weissen Wueste',
        excerpt:
          'Entdecken Sie geheime Camps, private Koeche und stille Duenen, die nur Eingeweihten vorbehalten sind.',
        category: 'Kultureintauchen',
      },
    },
  },
  {
    asset: 'journalMask',
    publishedAt: '2024-09-28T09:00:00.000Z',
    copy: {
      en: {
        title: "A Private Viewing of King Tut's Mask",
        excerpt:
          'How we arrange after-hours access to the Grand Egyptian Museum for a handful of guests.',
        category: 'Gastronomy',
      },
      es: {
        title: 'Una visita privada a la máscara de Tutankamón',
        excerpt:
          'Cómo organizamos accesos fuera de horario al Gran Museo Egipcio para un puñado de huéspedes.',
        category: 'Gastronomía',
      },
      de: {
        title: 'Eine private Besichtigung der Maske des Tutanchamun',
        excerpt:
          'Wie wir fuer eine Handvoll Gaeste Zutritt zum Grossen Aegyptischen Museum ausserhalb der Oeffnungszeiten arrangieren.',
        category: 'Gastronomie',
      },
    },
  },
  {
    asset: 'journalNile',
    publishedAt: '2024-09-15T09:00:00.000Z',
    copy: {
      en: {
        title: 'Sailing the Nile on a Private Dahabiya',
        excerpt:
          'Why the slowest way down the river remains the most extraordinary way to see it.',
        category: 'Adventure',
      },
      es: {
        title: 'Navegar el Nilo en una dahabiya privada',
        excerpt:
          'Por qué la forma más lenta de recorrer el río sigue siendo la más extraordinaria.',
        category: 'Aventura',
      },
      de: {
        title: 'Mit einer privaten Dahabiya auf dem Nil',
        excerpt:
          'Warum der langsamste Weg flussabwaerts noch immer der aussergewoehnlichste ist.',
        category: 'Abenteuer',
      },
    },
  },
]

export const homeCopy: Translated<{
  heroTitle: string
  heroSubtitle: string
  offersBody: string
}> = {
  en: {
    heroTitle: 'Ancient Wonders, Modern Luxury: Discover Egypt with Imperial Tours',
    heroSubtitle:
      "Experience the world's most extraordinary destinations with unparalleled luxury and personalized service.",
    offersBody:
      'Discover our most prestigious seasonal journeys, curated for those who seek the extraordinary. These exclusive itineraries are available for a limited time only.',
  },
  es: {
    heroTitle: 'Maravillas antiguas, lujo moderno: descubre Egipto con Imperial Tours',
    heroSubtitle:
      'Vive los destinos más extraordinarios del mundo con un lujo y un servicio personalizado sin igual.',
    offersBody:
      'Descubre nuestros viajes de temporada más prestigiosos, diseñados para quienes buscan lo extraordinario. Estos itinerarios exclusivos están disponibles por tiempo limitado.',
  },
  de: {
    heroTitle: 'Antike Wunder, moderner Luxus: Entdecken Sie Aegypten mit Imperial Tours',
    heroSubtitle:
      'Erleben Sie die aussergewoehnlichsten Reiseziele der Welt mit unvergleichlichem Luxus und persoenlichem Service.',
    offersBody:
      'Entdecken Sie unsere exklusivsten Saisonreisen, kuratiert fuer alle, die das Aussergewoehnliche suchen. Diese Reiserouten sind nur fuer kurze Zeit verfuegbar.',
  },
}
