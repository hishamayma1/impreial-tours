import type { Locale } from '../../i18n/routing'
import type { Translated } from './data'

/**
 * Three sample records per service, in all three languages (spec Section 9, Phase 2).
 *
 * `asset` keys refer to entries in assets.json; the seed runner resolves them to the
 * Media documents it uploaded. A key that does not resolve simply leaves the image
 * empty rather than failing the seed.
 */

type TourCopy = {
  title: string
  shortDescription: string
  meetingPoint: string
  highlights: string[]
  included: string[]
}

export type SeedTour = {
  tourType: 'daily' | 'experience'
  asset: string
  difficulty: 'easy' | 'moderate' | 'hard'
  rating: number
  badge: 'none' | 'bestseller' | 'new'
  groupSizeMax: number
  daily?: {
    durationHours: number
    startTimes: string[]
    availableWeekdays: string[]
    pricePerPerson: number
    childPrice: number
    privateGroupPrice?: number
  }
  experience?: {
    durationDays: number
    nights: number
    basePricePerPerson: number
    singleSupplement: number
    priceTiers: Array<{ minPax: number; maxPax: number; pricePerPerson: number }>
    days: Translated<Array<{ dayTitle: string; dayDescription: string }>>
  }
  copy: Translated<TourCopy>
}

export const tourSeeds: SeedTour[] = [
  {
    tourType: 'daily',
    asset: 'destinationGiza',
    difficulty: 'easy',
    rating: 4.9,
    badge: 'bestseller',
    groupSizeMax: 12,
    daily: {
      durationHours: 8,
      startTimes: ['07:00', '09:00'],
      availableWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      pricePerPerson: 145,
      childPrice: 95,
      privateGroupPrice: 890,
    },
    copy: {
      en: {
        title: 'Pyramids of Giza and the Sphinx',
        shortDescription:
          'The last standing wonder of the ancient world, explored before the crowds arrive, with an Egyptologist who reads the stones for you.',
        meetingPoint: 'Your Cairo or Giza hotel lobby',
        highlights: ['Enter the Great Pyramid', 'Private time at the Sphinx', 'Panoramic desert viewpoint'],
        included: ['Egyptologist guide', 'Air-conditioned vehicle', 'Hotel pickup and drop-off', 'Bottled water'],
      },
      es: {
        title: 'Pirámides de Guiza y la Esfinge',
        shortDescription:
          'La última maravilla en pie del mundo antiguo, explorada antes de que lleguen las multitudes, con un egiptólogo que interpreta las piedras para usted.',
        meetingPoint: 'Recepción de su hotel en El Cairo o Guiza',
        highlights: ['Entrada a la Gran Pirámide', 'Tiempo privado ante la Esfinge', 'Mirador panorámico del desierto'],
        included: ['Guía egiptólogo', 'Vehículo con aire acondicionado', 'Recogida y regreso al hotel', 'Agua embotellada'],
      },
      de: {
        title: 'Pyramiden von Gizeh und die Sphinx',
        shortDescription:
          'Das letzte erhaltene Weltwunder der Antike — erkundet, bevor die Menschenmengen eintreffen, mit einem Ägyptologen, der die Steine für Sie liest.',
        meetingPoint: 'Lobby Ihres Hotels in Kairo oder Gizeh',
        highlights: ['Eintritt in die Cheops-Pyramide', 'Private Zeit an der Sphinx', 'Panoramablick über die Wüste'],
        included: ['Ägyptologische Reiseleitung', 'Klimatisiertes Fahrzeug', 'Abholung und Rückfahrt zum Hotel', 'Wasser'],
      },
    },
  },
  {
    tourType: 'daily',
    asset: 'destinationLuxor',
    difficulty: 'moderate',
    rating: 4.8,
    badge: 'none',
    groupSizeMax: 10,
    daily: {
      durationHours: 10,
      startTimes: ['06:00'],
      availableWeekdays: ['mon', 'wed', 'fri', 'sun'],
      pricePerPerson: 175,
      childPrice: 110,
    },
    copy: {
      en: {
        title: 'Valley of the Kings at Dawn',
        shortDescription:
          'Three royal tombs and the temple of Hatshepsut, walked in the cool of first light while the valley is still silent.',
        meetingPoint: 'Luxor east bank, hotel pickup',
        highlights: ['Three tombs of your choosing', 'Temple of Hatshepsut', 'Colossi of Memnon'],
        included: ['Egyptologist guide', 'All entrance fees', 'Nile crossing', 'Lunch overlooking the west bank'],
      },
      es: {
        title: 'Valle de los Reyes al amanecer',
        shortDescription:
          'Tres tumbas reales y el templo de Hatshepsut, recorridos con la frescura de la primera luz mientras el valle aún guarda silencio.',
        meetingPoint: 'Orilla este de Luxor, recogida en el hotel',
        highlights: ['Tres tumbas a su elección', 'Templo de Hatshepsut', 'Colosos de Memnón'],
        included: ['Guía egiptólogo', 'Todas las entradas', 'Cruce del Nilo', 'Almuerzo con vistas a la orilla oeste'],
      },
      de: {
        title: 'Tal der Könige im Morgengrauen',
        shortDescription:
          'Drei Königsgräber und der Hatschepsut-Tempel, erwandert in der Kühle des ersten Lichts, wenn das Tal noch schweigt.',
        meetingPoint: 'Ostufer von Luxor, Abholung am Hotel',
        highlights: ['Drei Gräber nach Ihrer Wahl', 'Hatschepsut-Tempel', 'Memnonkolosse'],
        included: ['Ägyptologische Reiseleitung', 'Alle Eintrittsgelder', 'Nilüberquerung', 'Mittagessen mit Blick auf das Westufer'],
      },
    },
  },
  {
    tourType: 'daily',
    asset: 'destinationAswan',
    difficulty: 'easy',
    rating: 4.7,
    badge: 'new',
    groupSizeMax: 8,
    daily: {
      durationHours: 5,
      startTimes: ['15:00'],
      availableWeekdays: ['tue', 'thu', 'sat'],
      pricePerPerson: 95,
      childPrice: 60,
    },
    copy: {
      en: {
        title: 'Philae Temple and a Felucca Sunset',
        shortDescription:
          'The island temple of Isis by launch, then the Nile under sail as the granite islands turn amber.',
        meetingPoint: 'Aswan Corniche, marked jetty',
        highlights: ['Island temple of Philae', 'Private felucca at golden hour', 'Nubian tea on board'],
        included: ['Guide', 'Motor launch and felucca', 'Entrance fees', 'Refreshments'],
      },
      es: {
        title: 'Templo de File y atardecer en faluca',
        shortDescription:
          'El templo insular de Isis en lancha y después el Nilo a vela, mientras las islas de granito se tiñen de ámbar.',
        meetingPoint: 'Corniche de Asuán, embarcadero señalizado',
        highlights: ['Templo insular de File', 'Faluca privada a la hora dorada', 'Té nubio a bordo'],
        included: ['Guía', 'Lancha motora y faluca', 'Entradas', 'Refrigerios'],
      },
      de: {
        title: 'Philae-Tempel und Feluken-Sonnenuntergang',
        shortDescription:
          'Der Inseltempel der Isis per Boot, danach der Nil unter Segeln, während die Granitinseln bernsteinfarben leuchten.',
        meetingPoint: 'Corniche von Assuan, markierter Anleger',
        highlights: ['Inseltempel von Philae', 'Private Feluke zur goldenen Stunde', 'Nubischer Tee an Bord'],
        included: ['Reiseleitung', 'Motorboot und Feluke', 'Eintrittsgelder', 'Erfrischungen'],
      },
    },
  },

  {
    tourType: 'experience',
    asset: 'offerNileCruise',
    difficulty: 'easy',
    rating: 4.9,
    badge: 'bestseller',
    groupSizeMax: 16,
    experience: {
      durationDays: 8,
      nights: 7,
      basePricePerPerson: 3200,
      singleSupplement: 780,
      priceTiers: [
        { minPax: 1, maxPax: 2, pricePerPerson: 3200 },
        { minPax: 3, maxPax: 5, pricePerPerson: 2900 },
        { minPax: 6, maxPax: 16, pricePerPerson: 2600 },
      ],
      days: {
        en: [
          { dayTitle: 'Arrival in Cairo', dayDescription: 'Met at the aircraft door, transferred to your suite overlooking the river.' },
          { dayTitle: 'Giza and Saqqara', dayDescription: 'The pyramid field from its first step at Saqqara to its perfection at Giza.' },
          { dayTitle: 'Fly to Luxor', dayDescription: 'Karnak in the late afternoon, when the hypostyle hall throws its longest shadows.' },
          { dayTitle: 'The West Bank', dayDescription: 'Valley of the Kings, Hatshepsut, and the artisans village at Deir el-Medina.' },
          { dayTitle: 'Sailing to Edfu', dayDescription: 'A slow river day, with the temple of Horus in the cool of the evening.' },
          { dayTitle: 'Kom Ombo and Aswan', dayDescription: 'The double temple at dawn, then the cataract city by felucca.' },
          { dayTitle: 'Abu Simbel', dayDescription: 'The great rock temples of Ramesses II, reached before the light hardens.' },
          { dayTitle: 'Departure', dayDescription: 'Home, or onward to the Red Sea.' },
        ],
        es: [
          { dayTitle: 'Llegada a El Cairo', dayDescription: 'Recepción en la puerta del avión y traslado a su suite con vistas al río.' },
          { dayTitle: 'Guiza y Saqqara', dayDescription: 'El campo de pirámides, desde su primer escalón en Saqqara hasta su perfección en Guiza.' },
          { dayTitle: 'Vuelo a Luxor', dayDescription: 'Karnak al final de la tarde, cuando la sala hipóstila proyecta sus sombras más largas.' },
          { dayTitle: 'La orilla oeste', dayDescription: 'Valle de los Reyes, Hatshepsut y el poblado de artesanos de Deir el-Medina.' },
          { dayTitle: 'Navegando a Edfu', dayDescription: 'Un día pausado de río, con el templo de Horus al fresco del atardecer.' },
          { dayTitle: 'Kom Ombo y Asuán', dayDescription: 'El templo doble al amanecer y después la ciudad de las cataratas en faluca.' },
          { dayTitle: 'Abu Simbel', dayDescription: 'Los grandes templos rupestres de Ramsés II, antes de que la luz se endurezca.' },
          { dayTitle: 'Regreso', dayDescription: 'A casa, o continuación hacia el mar Rojo.' },
        ],
        de: [
          { dayTitle: 'Ankunft in Kairo', dayDescription: 'Empfang an der Flugzeugtür, Transfer in Ihre Suite mit Blick auf den Fluss.' },
          { dayTitle: 'Gizeh und Saqqara', dayDescription: 'Das Pyramidenfeld — von der ersten Stufe in Saqqara bis zur Vollendung in Gizeh.' },
          { dayTitle: 'Flug nach Luxor', dayDescription: 'Karnak am späten Nachmittag, wenn die Säulenhalle ihre längsten Schatten wirft.' },
          { dayTitle: 'Das Westufer', dayDescription: 'Tal der Könige, Hatschepsut und das Handwerkerdorf Deir el-Medina.' },
          { dayTitle: 'Segeln nach Edfu', dayDescription: 'Ein langsamer Flusstag, mit dem Horus-Tempel in der Abendkühle.' },
          { dayTitle: 'Kom Ombo und Assuan', dayDescription: 'Der Doppeltempel im Morgengrauen, danach die Kataraktstadt per Feluke.' },
          { dayTitle: 'Abu Simbel', dayDescription: 'Die großen Felsentempel Ramses II., erreicht bevor das Licht hart wird.' },
          { dayTitle: 'Abreise', dayDescription: 'Nach Hause — oder weiter ans Rote Meer.' },
        ],
      },
    },
    copy: {
      en: {
        title: 'The Nile in Seven Nights',
        shortDescription: 'Cairo to Abu Simbel by air, road and river, on a chartered vessel of sixteen guests.',
        meetingPoint: 'Cairo International Airport, arrivals',
        highlights: ['Chartered river vessel', 'Abu Simbel before the coaches', 'Private Egyptologist throughout'],
        included: ['Seven nights full board', 'All internal flights', 'All entrance fees', 'Private guide and driver'],
      },
      es: {
        title: 'El Nilo en siete noches',
        shortDescription: 'De El Cairo a Abu Simbel por aire, carretera y río, en una embarcación privada de dieciséis huéspedes.',
        meetingPoint: 'Aeropuerto Internacional de El Cairo, llegadas',
        highlights: ['Embarcación fluvial privada', 'Abu Simbel antes que los autocares', 'Egiptólogo privado durante todo el viaje'],
        included: ['Siete noches en pensión completa', 'Todos los vuelos internos', 'Todas las entradas', 'Guía y conductor privados'],
      },
      de: {
        title: 'Der Nil in sieben Nächten',
        shortDescription: 'Von Kairo nach Abu Simbel per Flug, Straße und Fluss — auf einem gecharterten Schiff für sechzehn Gäste.',
        meetingPoint: 'Internationaler Flughafen Kairo, Ankunft',
        highlights: ['Gechartertes Flussschiff', 'Abu Simbel vor den Reisebussen', 'Durchgehend privater Ägyptologe'],
        included: ['Sieben Nächte Vollpension', 'Alle Inlandsflüge', 'Alle Eintrittsgelder', 'Privater Guide und Fahrer'],
      },
    },
  },
  {
    tourType: 'experience',
    asset: 'offerDesert',
    difficulty: 'moderate',
    rating: 4.8,
    badge: 'none',
    groupSizeMax: 8,
    experience: {
      durationDays: 5,
      nights: 4,
      basePricePerPerson: 2100,
      singleSupplement: 460,
      priceTiers: [
        { minPax: 1, maxPax: 2, pricePerPerson: 2100 },
        { minPax: 3, maxPax: 8, pricePerPerson: 1850 },
      ],
      days: {
        en: [
          { dayTitle: 'Into the Black Desert', dayDescription: 'Out of Cairo by four-wheel drive, camp beneath volcanic hills.' },
          { dayTitle: 'The White Desert', dayDescription: 'Chalk formations carved by wind, and a night under an unpolluted sky.' },
          { dayTitle: 'Farafra and the springs', dayDescription: 'Hot springs, palm gardens, and the quiet of a working oasis.' },
          { dayTitle: 'Bahariya', dayDescription: 'The Golden Mummies museum and the temple of Alexander.' },
          { dayTitle: 'Return to Cairo', dayDescription: 'Back along the desert road, arriving by late afternoon.' },
        ],
        es: [
          { dayTitle: 'Hacia el Desierto Negro', dayDescription: 'Salida de El Cairo en todoterreno y acampada bajo colinas volcánicas.' },
          { dayTitle: 'El Desierto Blanco', dayDescription: 'Formaciones de creta esculpidas por el viento y una noche bajo un cielo sin contaminación.' },
          { dayTitle: 'Farafra y los manantiales', dayDescription: 'Aguas termales, palmerales y la calma de un oasis en activo.' },
          { dayTitle: 'Bahariya', dayDescription: 'El museo de las Momias Doradas y el templo de Alejandro.' },
          { dayTitle: 'Regreso a El Cairo', dayDescription: 'De vuelta por la carretera del desierto, llegando a última hora de la tarde.' },
        ],
        de: [
          { dayTitle: 'In die Schwarze Wüste', dayDescription: 'Mit dem Geländewagen aus Kairo hinaus, Camp unter vulkanischen Hügeln.' },
          { dayTitle: 'Die Weiße Wüste', dayDescription: 'Vom Wind geformte Kreidefelsen und eine Nacht unter unverfälschtem Sternenhimmel.' },
          { dayTitle: 'Farafra und die Quellen', dayDescription: 'Heiße Quellen, Palmengärten und die Ruhe einer lebendigen Oase.' },
          { dayTitle: 'Bahariya', dayDescription: 'Das Museum der Goldenen Mumien und der Alexandertempel.' },
          { dayTitle: 'Rückkehr nach Kairo', dayDescription: 'Zurück über die Wüstenstraße, Ankunft am späten Nachmittag.' },
        ],
      },
    },
    copy: {
      en: {
        title: 'White Desert Expedition',
        shortDescription: 'Four nights under canvas among chalk towers and volcanic hills, guided by desert Bedouin.',
        meetingPoint: 'Cairo hotel pickup, 06:00',
        highlights: ['Two nights wild camping', 'Bedouin cooking over open fire', 'Hot springs at Farafra'],
        included: ['Four-wheel drive and driver', 'All camping equipment', 'All meals', 'Permits'],
      },
      es: {
        title: 'Expedición al Desierto Blanco',
        shortDescription: 'Cuatro noches de acampada entre torres de creta y colinas volcánicas, guiados por beduinos del desierto.',
        meetingPoint: 'Recogida en hotel de El Cairo, 06:00',
        highlights: ['Dos noches de acampada libre', 'Cocina beduina al fuego', 'Aguas termales en Farafra'],
        included: ['Todoterreno con conductor', 'Todo el equipo de acampada', 'Todas las comidas', 'Permisos'],
      },
      de: {
        title: 'Expedition Weiße Wüste',
        shortDescription: 'Vier Nächte im Zelt zwischen Kreidetürmen und Vulkanhügeln, geführt von Wüstenbeduinen.',
        meetingPoint: 'Abholung am Hotel in Kairo, 06:00 Uhr',
        highlights: ['Zwei Nächte freies Camping', 'Beduinenküche am offenen Feuer', 'Heiße Quellen in Farafra'],
        included: ['Geländewagen mit Fahrer', 'Komplette Campingausrüstung', 'Alle Mahlzeiten', 'Genehmigungen'],
      },
    },
  },
  {
    tourType: 'experience',
    asset: 'offerRedSea',
    difficulty: 'easy',
    rating: 4.7,
    badge: 'new',
    groupSizeMax: 12,
    experience: {
      durationDays: 6,
      nights: 5,
      basePricePerPerson: 2450,
      singleSupplement: 590,
      priceTiers: [
        { minPax: 1, maxPax: 2, pricePerPerson: 2450 },
        { minPax: 3, maxPax: 6, pricePerPerson: 2200 },
        { minPax: 7, maxPax: 12, pricePerPerson: 1980 },
      ],
      days: {
        en: [
          { dayTitle: 'Arrival on the coast', dayDescription: 'Transfer to your beach villa and an afternoon on the reef.' },
          { dayTitle: 'Northern reefs', dayDescription: 'Two dives or a snorkel drift over the shallow gardens.' },
          { dayTitle: 'Wreck day', dayDescription: 'The Thistlegorm, reached at first light ahead of the day boats.' },
          { dayTitle: 'Desert and sea', dayDescription: 'Morning in the eastern desert, afternoon back on the water.' },
          { dayTitle: 'Open day', dayDescription: 'Dive, sail, or do nothing at all.' },
          { dayTitle: 'Departure', dayDescription: 'A late checkout and the transfer to Hurghada.' },
        ],
        es: [
          { dayTitle: 'Llegada a la costa', dayDescription: 'Traslado a su villa junto al mar y una tarde en el arrecife.' },
          { dayTitle: 'Arrecifes del norte', dayDescription: 'Dos inmersiones o snorkel a la deriva sobre los jardines poco profundos.' },
          { dayTitle: 'Día de pecios', dayDescription: 'El Thistlegorm, alcanzado con las primeras luces antes que los barcos de excursión.' },
          { dayTitle: 'Desierto y mar', dayDescription: 'Mañana en el desierto oriental, tarde de vuelta en el agua.' },
          { dayTitle: 'Día libre', dayDescription: 'Bucear, navegar o no hacer absolutamente nada.' },
          { dayTitle: 'Salida', dayDescription: 'Salida tardía del alojamiento y traslado a Hurgada.' },
        ],
        de: [
          { dayTitle: 'Ankunft an der Küste', dayDescription: 'Transfer zu Ihrer Strandvilla und ein Nachmittag am Riff.' },
          { dayTitle: 'Nördliche Riffe', dayDescription: 'Zwei Tauchgänge oder Schnorcheln über den flachen Gärten.' },
          { dayTitle: 'Wracktag', dayDescription: 'Die Thistlegorm, erreicht im ersten Licht vor den Tagesbooten.' },
          { dayTitle: 'Wüste und Meer', dayDescription: 'Vormittag in der Ostwüste, nachmittags zurück aufs Wasser.' },
          { dayTitle: 'Freier Tag', dayDescription: 'Tauchen, segeln — oder gar nichts tun.' },
          { dayTitle: 'Abreise', dayDescription: 'Später Check-out und Transfer nach Hurghada.' },
        ],
      },
    },
    copy: {
      en: {
        title: 'Red Sea Reefs and Wrecks',
        shortDescription: 'Five nights on the coast with a private dive guide, a beach villa, and the Thistlegorm at dawn.',
        meetingPoint: 'Hurghada International Airport',
        highlights: ['The Thistlegorm before the crowds', 'Private dive guide', 'Beach villa with reef access'],
        included: ['Five nights half board', 'All dives and equipment', 'Airport transfers', 'Marine park fees'],
      },
      es: {
        title: 'Arrecifes y pecios del mar Rojo',
        shortDescription: 'Cinco noches en la costa con guía de buceo privado, villa junto al mar y el Thistlegorm al amanecer.',
        meetingPoint: 'Aeropuerto Internacional de Hurgada',
        highlights: ['El Thistlegorm antes que las multitudes', 'Guía de buceo privado', 'Villa con acceso al arrecife'],
        included: ['Cinco noches en media pensión', 'Todas las inmersiones y el equipo', 'Traslados al aeropuerto', 'Tasas del parque marino'],
      },
      de: {
        title: 'Riffe und Wracks am Roten Meer',
        shortDescription: 'Fünf Nächte an der Küste mit privatem Tauchguide, Strandvilla und der Thistlegorm im Morgengrauen.',
        meetingPoint: 'Internationaler Flughafen Hurghada',
        highlights: ['Die Thistlegorm vor dem Andrang', 'Privater Tauchguide', 'Strandvilla mit Riffzugang'],
        included: ['Fünf Nächte Halbpension', 'Alle Tauchgänge und Ausrüstung', 'Flughafentransfers', 'Meeresparkgebühren'],
      },
    },
  },
]

export type SeedHotel = {
  asset: string
  starRating: number
  amenities: string[]
  rooms: Array<{
    single: number
    double: number
    triple: number
    maxOccupancy: number
    inventory: number
    names: Translated<{ roomName: string; bedConfiguration: string }>
  }>
  seasons: Array<{ startDate: string; endDate: string; multiplier: number; labels: Translated<string> }>
  copy: Translated<{ name: string; description: string; address: string }>
}

export const hotelSeeds: SeedHotel[] = [
  {
    asset: 'destinationGiza',
    starRating: 5,
    amenities: ['wifi', 'pool', 'spa', 'breakfast', 'restaurant', 'ac', 'airportShuttle'],
    rooms: [
      {
        single: 240, double: 165, triple: 130, maxOccupancy: 3, inventory: 12,
        names: {
          en: { roomName: 'Pyramid View Deluxe', bedConfiguration: 'One king or two twins' },
          es: { roomName: 'Deluxe con vistas a las pirámides', bedConfiguration: 'Una cama de matrimonio o dos individuales' },
          de: { roomName: 'Deluxe mit Pyramidenblick', bedConfiguration: 'Ein Kingsize-Bett oder zwei Einzelbetten' },
        },
      },
      {
        single: 390, double: 275, triple: 220, maxOccupancy: 3, inventory: 4,
        names: {
          en: { roomName: 'Garden Suite', bedConfiguration: 'King bed with separate sitting room' },
          es: { roomName: 'Suite con jardín', bedConfiguration: 'Cama de matrimonio y salón independiente' },
          de: { roomName: 'Gartensuite', bedConfiguration: 'Kingsize-Bett mit separatem Wohnraum' },
        },
      },
    ],
    seasons: [
      { startDate: '2026-12-15', endDate: '2027-01-10', multiplier: 1.35,
        labels: { en: 'Christmas and New Year', es: 'Navidad y Año Nuevo', de: 'Weihnachten und Neujahr' } },
      { startDate: '2026-06-01', endDate: '2026-08-31', multiplier: 0.85,
        labels: { en: 'Summer', es: 'Verano', de: 'Sommer' } },
    ],
    copy: {
      en: {
        name: 'Mena House Gardens',
        description: 'A colonial palace at the foot of the Giza plateau, where the Great Pyramid fills the window and the gardens have grown for a century.',
        address: 'Pyramids Road, Giza, Egypt',
      },
      es: {
        name: 'Jardines de Mena House',
        description: 'Un palacio colonial a los pies de la meseta de Guiza, donde la Gran Pirámide llena la ventana y los jardines llevan un siglo creciendo.',
        address: 'Carretera de las Pirámides, Guiza, Egipto',
      },
      de: {
        name: 'Mena House Gärten',
        description: 'Ein Kolonialpalast am Fuß des Gizeh-Plateaus, wo die Cheops-Pyramide das Fenster füllt und die Gärten seit einem Jahrhundert wachsen.',
        address: 'Pyramids Road, Gizeh, Ägypten',
      },
    },
  },
  {
    asset: 'destinationAswan',
    starRating: 5,
    amenities: ['wifi', 'pool', 'spa', 'breakfast', 'restaurant', 'ac', 'gym'],
    rooms: [
      {
        single: 310, double: 210, triple: 170, maxOccupancy: 3, inventory: 9,
        names: {
          en: { roomName: 'Nile View Room', bedConfiguration: 'One king bed' },
          es: { roomName: 'Habitación con vistas al Nilo', bedConfiguration: 'Una cama de matrimonio' },
          de: { roomName: 'Zimmer mit Nilblick', bedConfiguration: 'Ein Kingsize-Bett' },
        },
      },
    ],
    seasons: [
      { startDate: '2026-11-01', endDate: '2027-02-28', multiplier: 1.2,
        labels: { en: 'High season', es: 'Temporada alta', de: 'Hochsaison' } },
    ],
    copy: {
      en: {
        name: 'Old Cataract Terrace',
        description: 'Rose-red Victorian rooms above the first cataract, with a terrace that has watched the same river bend for a hundred and twenty years.',
        address: 'Abtal El Tahrir Street, Aswan, Egypt',
      },
      es: {
        name: 'Terraza Old Cataract',
        description: 'Habitaciones victorianas de color rojo rosado sobre la primera catarata, con una terraza que lleva ciento veinte años contemplando el mismo meandro.',
        address: 'Calle Abtal El Tahrir, Asuán, Egipto',
      },
      de: {
        name: 'Old Cataract Terrasse',
        description: 'Rosenrote viktorianische Zimmer über dem ersten Katarakt, mit einer Terrasse, die seit hundertzwanzig Jahren dieselbe Flussbiegung überblickt.',
        address: 'Abtal El Tahrir Straße, Assuan, Ägypten',
      },
    },
  },
  {
    asset: 'destinationLuxor',
    starRating: 4,
    amenities: ['wifi', 'pool', 'breakfast', 'ac', 'restaurant', 'petFriendly'],
    rooms: [
      {
        single: 150, double: 105, triple: 85, maxOccupancy: 3, inventory: 16,
        names: {
          en: { roomName: 'Courtyard Room', bedConfiguration: 'Two twin beds' },
          es: { roomName: 'Habitación con patio', bedConfiguration: 'Dos camas individuales' },
          de: { roomName: 'Innenhofzimmer', bedConfiguration: 'Zwei Einzelbetten' },
        },
      },
    ],
    seasons: [],
    copy: {
      en: {
        name: 'West Bank Courtyard House',
        description: 'A mudbrick house among the sugarcane on the west bank, ten minutes from the Valley of the Kings and a world away from the corniche.',
        address: 'Al Gezira, West Bank, Luxor, Egypt',
      },
      es: {
        name: 'Casa con patio de la orilla oeste',
        description: 'Una casa de adobe entre cañaverales en la orilla oeste, a diez minutos del Valle de los Reyes y a un mundo de distancia de la corniche.',
        address: 'Al Gezira, orilla oeste, Luxor, Egipto',
      },
      de: {
        name: 'Innenhofhaus am Westufer',
        description: 'Ein Lehmziegelhaus zwischen Zuckerrohrfeldern am Westufer, zehn Minuten vom Tal der Könige und eine Welt entfernt von der Corniche.',
        address: 'Al Gezira, Westufer, Luxor, Ägypten',
      },
    },
  },
]

export type SeedTransfer = {
  transferType: 'airport' | 'intercity' | 'custom'
  vehicles: Array<{ maxPassengers: number; maxLuggage: number; names: Translated<string> }>
  zones?: Array<{ prices: Array<{ price: number; vehicleIndex: number }>; names: Translated<string> }>
  routes?: Array<{ distanceKm: number; durationMin: number; prices: Array<{ price: number; vehicleIndex: number }>; names: Translated<{ fromCity: string; toCity: string }> }>
  copy: Translated<{ title: string; description: string }>
}

const FLEET: SeedTransfer['vehicles'] = [
  { maxPassengers: 3, maxLuggage: 3, names: { en: 'Sedan', es: 'Sedán', de: 'Limousine' } },
  { maxPassengers: 6, maxLuggage: 6, names: { en: 'Minivan', es: 'Monovolumen', de: 'Minivan' } },
  { maxPassengers: 7, maxLuggage: 8, names: { en: 'VIP Van', es: 'Furgoneta VIP', de: 'VIP-Van' } },
]

export const transferSeeds: SeedTransfer[] = [
  {
    transferType: 'airport',
    vehicles: FLEET,
    zones: [
      {
        prices: [{ price: 32, vehicleIndex: 0 }, { price: 48, vehicleIndex: 1 }, { price: 75, vehicleIndex: 2 }],
        names: { en: 'Cairo city centre and Zamalek', es: 'Centro de El Cairo y Zamalek', de: 'Stadtzentrum Kairo und Zamalek' },
      },
      {
        prices: [{ price: 45, vehicleIndex: 0 }, { price: 62, vehicleIndex: 1 }, { price: 92, vehicleIndex: 2 }],
        names: { en: 'Giza and the pyramid hotels', es: 'Guiza y los hoteles de las pirámides', de: 'Gizeh und die Pyramidenhotels' },
      },
    ],
    copy: {
      en: { title: 'Cairo Airport Transfer', description: 'Meet-and-greet at the aircraft door, fixed price by zone, sixty minutes of free waiting.' },
      es: { title: 'Traslado aeropuerto de El Cairo', description: 'Recepción en la puerta del avión, precio fijo por zona y sesenta minutos de espera gratuita.' },
      de: { title: 'Flughafentransfer Kairo', description: 'Empfang an der Flugzeugtür, Festpreis nach Zone, sechzig Minuten kostenlose Wartezeit.' },
    },
  },
  {
    transferType: 'intercity',
    vehicles: FLEET,
    routes: [
      {
        distanceKm: 220, durationMin: 165,
        prices: [{ price: 120, vehicleIndex: 0 }, { price: 165, vehicleIndex: 1 }, { price: 210, vehicleIndex: 2 }],
        names: { en: { fromCity: 'Cairo', toCity: 'Alexandria' }, es: { fromCity: 'El Cairo', toCity: 'Alejandría' }, de: { fromCity: 'Kairo', toCity: 'Alexandria' } },
      },
      {
        distanceKm: 215, durationMin: 195,
        prices: [{ price: 135, vehicleIndex: 0 }, { price: 180, vehicleIndex: 1 }, { price: 230, vehicleIndex: 2 }],
        names: { en: { fromCity: 'Luxor', toCity: 'Aswan' }, es: { fromCity: 'Luxor', toCity: 'Asuán' }, de: { fromCity: 'Luxor', toCity: 'Assuan' } },
      },
    ],
    copy: {
      en: { title: 'City to City Routes', description: 'Direct road transfers between Egypt’s cities at a fixed price per vehicle class.' },
      es: { title: 'Rutas entre ciudades', description: 'Traslados directos por carretera entre las ciudades de Egipto a precio fijo por clase de vehículo.' },
      de: { title: 'Strecken zwischen Städten', description: 'Direkte Straßentransfers zwischen Ägyptens Städten zum Festpreis je Fahrzeugklasse.' },
    },
  },
  {
    transferType: 'custom',
    vehicles: FLEET,
    copy: {
      en: { title: 'Custom Trip Quote', description: 'Multi-stop journeys, full-day charters and anything not on the list — quoted by hand on WhatsApp.' },
      es: { title: 'Presupuesto de viaje a medida', description: 'Trayectos con varias paradas, contrataciones de día completo y todo lo que no esté en la lista: presupuestado a mano por WhatsApp.' },
      de: { title: 'Angebot für individuelle Reisen', description: 'Fahrten mit mehreren Stopps, Ganztagescharter und alles, was nicht auf der Liste steht — persönlich per WhatsApp kalkuliert.' },
    },
  },
]

export type SeedBicycle = {
  bikeType: 'rental' | 'tour'
  asset: string
  rental?: {
    electric: boolean
    gears: number
    deposit: number
    inventory: number
    bands: Array<{ hours: number; price: number; labels: Translated<string> }>
    accessories: Translated<string[]>
  }
  tour?: {
    distanceKm: number
    elevationGainM: number
    difficulty: 'easy' | 'moderate' | 'hard'
    durationHours: number
    pricePerPerson: number
    minAge: number
    maxGroupSize: number
    startTimes: string[]
    stops: Translated<Array<{ stopName: string; stopDescription: string }>>
  }
  copy: Translated<{ title: string; description: string; routeName?: string; bikeModel?: string }>
}

const BANDS = (h1: number, half: number, full: number, week: number) => [
  { hours: 1, price: h1, labels: { en: '1 hour', es: '1 hora', de: '1 Stunde' } as Translated<string> },
  { hours: 6, price: half, labels: { en: 'Half day', es: 'Medio día', de: 'Halber Tag' } as Translated<string> },
  { hours: 12, price: full, labels: { en: 'Full day', es: 'Día completo', de: 'Ganzer Tag' } as Translated<string> },
  { hours: 168, price: week, labels: { en: 'Weekly', es: 'Semanal', de: 'Wöchentlich' } as Translated<string> },
]

export const bicycleSeeds: SeedBicycle[] = [
  {
    bikeType: 'rental',
    asset: 'destinationLuxor',
    rental: {
      electric: false, gears: 7, deposit: 50, inventory: 14,
      bands: BANDS(6, 18, 28, 130),
      accessories: {
        en: ['Helmet', 'Lock', 'Lights', 'Route map', 'Repair kit'],
        es: ['Casco', 'Candado', 'Luces', 'Mapa de ruta', 'Kit de reparación'],
        de: ['Helm', 'Schloss', 'Beleuchtung', 'Streckenkarte', 'Reparaturset'],
      },
    },
    copy: {
      en: { title: 'City Cruiser', description: 'A comfortable seven-speed for the corniche and the west bank lanes.', bikeModel: 'Cairo Cruiser 7' },
      es: { title: 'Bicicleta urbana', description: 'Una cómoda bicicleta de siete velocidades para la corniche y los caminos de la orilla oeste.', bikeModel: 'Cairo Cruiser 7' },
      de: { title: 'City-Cruiser', description: 'Ein bequemes Sieben-Gang-Rad für die Corniche und die Wege am Westufer.', bikeModel: 'Cairo Cruiser 7' },
    },
  },
  {
    bikeType: 'rental',
    asset: 'destinationAswan',
    rental: {
      electric: true, gears: 9, deposit: 120, inventory: 6,
      bands: BANDS(12, 34, 52, 260),
      accessories: {
        en: ['Helmet', 'Lock', 'Lights', 'Charger', 'Repair kit'],
        es: ['Casco', 'Candado', 'Luces', 'Cargador', 'Kit de reparación'],
        de: ['Helm', 'Schloss', 'Beleuchtung', 'Ladegerät', 'Reparaturset'],
      },
    },
    copy: {
      en: { title: 'Electric Trail Bike', description: 'Pedal assist for the desert tracks behind Aswan, with range for a full day.', bikeModel: 'Nubia E-Trail' },
      es: { title: 'Bicicleta eléctrica de montaña', description: 'Pedaleo asistido para las pistas del desierto tras Asuán, con autonomía para todo el día.', bikeModel: 'Nubia E-Trail' },
      de: { title: 'Elektro-Trailbike', description: 'Tretunterstützung für die Wüstenpisten hinter Assuan, mit Reichweite für einen ganzen Tag.', bikeModel: 'Nubia E-Trail' },
    },
  },
  {
    bikeType: 'tour',
    asset: 'destinationGiza',
    tour: {
      distanceKm: 24, elevationGainM: 180, difficulty: 'moderate', durationHours: 4,
      pricePerPerson: 65, minAge: 14, maxGroupSize: 8, startTimes: ['06:30', '15:30'],
      stops: {
        en: [
          { stopName: 'Saqqara causeway', stopDescription: 'The step pyramid from the palm groves below.' },
          { stopName: 'Abusir', stopDescription: 'Four pyramids and almost no one else.' },
          { stopName: 'Giza plateau edge', stopDescription: 'The last climb, and the whole field laid out beneath you.' },
        ],
        es: [
          { stopName: 'Calzada de Saqqara', stopDescription: 'La pirámide escalonada vista desde los palmerales.' },
          { stopName: 'Abusir', stopDescription: 'Cuatro pirámides y casi nadie más.' },
          { stopName: 'Borde de la meseta de Guiza', stopDescription: 'La última subida y todo el campo de pirámides a sus pies.' },
        ],
        de: [
          { stopName: 'Saqqara-Aufweg', stopDescription: 'Die Stufenpyramide von den Palmenhainen aus.' },
          { stopName: 'Abusir', stopDescription: 'Vier Pyramiden und fast niemand sonst.' },
          { stopName: 'Rand des Gizeh-Plateaus', stopDescription: 'Der letzte Anstieg — und das ganze Feld liegt unter Ihnen.' },
        ],
      },
    },
    copy: {
      en: { title: 'Pyramid Fields by Bicycle', description: 'Saqqara to Giza along the desert edge, twenty-four kilometres on quiet tracks.', routeName: 'The Memphis necropolis route' },
      es: { title: 'Campos de pirámides en bicicleta', description: 'De Saqqara a Guiza por el borde del desierto: veinticuatro kilómetros por pistas tranquilas.', routeName: 'Ruta de la necrópolis de Menfis' },
      de: { title: 'Pyramidenfelder mit dem Fahrrad', description: 'Von Saqqara nach Gizeh am Wüstenrand entlang — vierundzwanzig Kilometer auf ruhigen Wegen.', routeName: 'Route der Nekropole von Memphis' },
    },
  },
]

export const serviceLocales: Locale[] = ['en', 'es', 'de']
