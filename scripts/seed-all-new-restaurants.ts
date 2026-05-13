import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createAdminClient } from '../lib/supabase/admin'

type DayHours = { open: string; close: string; closed?: boolean }
type OpeningHours = Record<string, DayHours | undefined>

interface NewRestaurant {
  email: string
  password: string
  name: string
  slug: string
  city: string
  type: string
  address?: string
  phone?: string
  website?: string
  opening_hours: OpeningHours
}

const std = (o: string, c: string): DayHours => ({ open: o, close: c })
const closed: DayHours = { open: '', close: '', closed: true }

const woche = (o: string, c: string, sat?: DayHours, sun?: DayHours): OpeningHours => ({
  monday: std(o, c), tuesday: std(o, c), wednesday: std(o, c),
  thursday: std(o, c), friday: std(o, c),
  saturday: sat ?? std(o, c), sunday: sun ?? closed,
})

const NEW_RESTAURANTS: NewRestaurant[] = [
  // ── Aalen ──────────────────────────────────────────────────────────────────
  {
    email: 'pinocchio-aalen@gastro.pistazz.io', password: 'Pinocchio2026!',
    name: 'Ristorante Pinocchio', slug: 'pinocchio-aalen', city: 'Aalen', type: 'restaurant',
    address: 'Bahnhofstraße 28, 73430 Aalen', phone: '+49 7361 12345',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00'), std('12:00', '22:00')),
  },
  {
    email: 'taj-mahal-aalen@gastro.pistazz.io', password: 'TajMahal2026!',
    name: 'Taj Mahal Aalen', slug: 'taj-mahal-aalen', city: 'Aalen', type: 'restaurant',
    address: 'Marktplatz 8, 73430 Aalen',
    opening_hours: woche('12:00', '22:30'),
  },
  {
    email: 'china-garden-aalen@gastro.pistazz.io', password: 'ChinaGarden2026!',
    name: 'China Garden Aalen', slug: 'china-garden-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'zum-ochsen-aalen@gastro.pistazz.io', password: 'ZumOchsen2026!',
    name: 'Gasthof Zum Ochsen', slug: 'zum-ochsen-aalen', city: 'Aalen', type: 'restaurant',
    address: 'Hauptstraße 44, 73430 Aalen',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'pizzeria-venezia-aalen@gastro.pistazz.io', password: 'Venezia2026!',
    name: 'Pizzeria Venezia', slug: 'pizzeria-venezia-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'burger-house-aalen@gastro.pistazz.io', password: 'BurgerHouse2026!',
    name: 'Burger House Aalen', slug: 'burger-house-aalen', city: 'Aalen', type: 'bistro',
    opening_hours: woche('11:00', '22:00', std('11:00', '23:00'), std('12:00', '21:00')),
  },
  {
    email: 'kaffeehaus-aalen@gastro.pistazz.io', password: 'Kaffeehaus2026!',
    name: 'Kaffeehaus Central', slug: 'kaffeehaus-central-aalen', city: 'Aalen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'thai-orchid-aalen@gastro.pistazz.io', password: 'ThaiOrchid2026!',
    name: 'Thai Orchid Aalen', slug: 'thai-orchid-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: { ...woche('12:00', '22:00'), tuesday: closed },
  },
  {
    email: 'max-brau-aalen@gastro.pistazz.io', password: 'MaxBrau2026!',
    name: 'Max & Moritz Bräu', slug: 'max-brau-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00'), std('11:00', '22:00')),
  },
  {
    email: 'sushi-garden-aalen@gastro.pistazz.io', password: 'SushiGarden2026!',
    name: 'Sushi Garden Aalen', slug: 'sushi-garden-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '22:30'), std('12:00', '21:00')),
  },
  {
    email: 'grillhaus-aalen@gastro.pistazz.io', password: 'Grillhaus2026!',
    name: 'Grillhaus Aalen', slug: 'grillhaus-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00'),
  },
  {
    email: 'balkan-grill-aalen@gastro.pistazz.io', password: 'BalkanGrill2026!',
    name: 'Balkan Grill Aalen', slug: 'balkan-grill-aalen', city: 'Aalen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  // ── Schwäbisch Gmünd ───────────────────────────────────────────────────────
  {
    email: 'cafe-max-gmuend@gastro.pistazz.io', password: 'CafeMax2026!',
    name: 'Café Max Gmünd', slug: 'cafe-max-gmuend', city: 'Schwäbisch Gmünd', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'ratskeller-gmuend@gastro.pistazz.io', password: 'Ratskeller2026!',
    name: 'Ratskeller Gmünd', slug: 'ratskeller-gmuend', city: 'Schwäbisch Gmünd', type: 'restaurant',
    address: 'Marktplatz 1, 73525 Schwäbisch Gmünd',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'trattoria-gmuend@gastro.pistazz.io', password: 'Trattoria2026!',
    name: 'Trattoria da Luigi', slug: 'trattoria-luigi-gmuend', city: 'Schwäbisch Gmünd', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'augustiner-gmuend@gastro.pistazz.io', password: 'Augustiner2026!',
    name: 'Augustiner Keller', slug: 'augustiner-keller-gmuend', city: 'Schwäbisch Gmünd', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00'), std('11:00', '22:00')),
  },
  {
    email: 'saigon-gmuend@gastro.pistazz.io', password: 'Saigon2026!',
    name: 'Saigon Street Food', slug: 'saigon-gmuend', city: 'Schwäbisch Gmünd', type: 'restaurant',
    opening_hours: woche('11:30', '21:30'),
  },
  {
    email: 'zum-lamm-gmuend@gastro.pistazz.io', password: 'ZumLamm2026!',
    name: 'Gasthof Zum Lamm', slug: 'zum-lamm-gmuend', city: 'Schwäbisch Gmünd', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), tuesday: closed, wednesday: closed },
  },
  {
    email: 'bierhaus-gmuend@gastro.pistazz.io', password: 'Bierhaus2026!',
    name: 'Bierhaus Gmünd', slug: 'bierhaus-gmuend', city: 'Schwäbisch Gmünd', type: 'bar',
    opening_hours: woche('16:00', '01:00', std('14:00', '02:00'), std('14:00', '00:00')),
  },
  {
    email: 'subway-gmuend@gastro.pistazz.io', password: 'Subway2026!',
    name: 'Subway Gmünd', slug: 'subway-gmuend', city: 'Schwäbisch Gmünd', type: 'imbiss',
    opening_hours: woche('09:00', '22:00', std('09:00', '22:00'), std('10:00', '21:00')),
  },
  {
    email: 'marktcafe-gmuend@gastro.pistazz.io', password: 'Marktcafe2026!',
    name: 'Marktcafé Gmünd', slug: 'marktcafe-gmuend', city: 'Schwäbisch Gmünd', type: 'cafe',
    opening_hours: woche('07:30', '18:00', std('07:30', '17:00'), std('09:00', '17:00')),
  },
  // ── Ellwangen ──────────────────────────────────────────────────────────────
  {
    email: 'jagst-restaurant@gastro.pistazz.io', password: 'Jagst2026!',
    name: 'Jagst Restaurant', slug: 'jagst-restaurant-ellwangen', city: 'Ellwangen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'pizzeria-ellwangen@gastro.pistazz.io', password: 'PizzeriaEll2026!',
    name: 'Pizzeria Roma Ellwangen', slug: 'pizzeria-roma-ellwangen', city: 'Ellwangen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'cafe-residenz-ellwangen@gastro.pistazz.io', password: 'CafeResidenz2026!',
    name: 'Café Residenz', slug: 'cafe-residenz-ellwangen', city: 'Ellwangen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'schlossberg-ellwangen@gastro.pistazz.io', password: 'Schlossberg2026!',
    name: 'Schlossberg Stüble', slug: 'schlossberg-stuebele-ellwangen', city: 'Ellwangen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed, tuesday: closed },
  },
  {
    email: 'grieche-ellwangen@gastro.pistazz.io', password: 'Grieche2026!',
    name: 'Taverna Olympia', slug: 'taverna-olympia-ellwangen', city: 'Ellwangen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'chinatown-ellwangen@gastro.pistazz.io', password: 'Chinatown2026!',
    name: 'China Town Ellwangen', slug: 'china-town-ellwangen', city: 'Ellwangen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'bahnhof-brasserie-ellwangen@gastro.pistazz.io', password: 'BahnhofBrasserie2026!',
    name: 'Bahnhof Brasserie', slug: 'bahnhof-brasserie-ellwangen', city: 'Ellwangen', type: 'bistro',
    opening_hours: woche('06:00', '22:00', std('07:00', '22:00'), std('08:00', '20:00')),
  },
  // ── Heidenheim ─────────────────────────────────────────────────────────────
  {
    email: 'brenz-keller@gastro.pistazz.io', password: 'BrenzKeller2026!',
    name: 'Brenz Keller', slug: 'brenz-keller-heidenheim', city: 'Heidenheim', type: 'restaurant',
    address: 'Hauptstraße 60, 89518 Heidenheim',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'cafe-central-hdh@gastro.pistazz.io', password: 'CafeCentralHdh2026!',
    name: 'Café Central Heidenheim', slug: 'cafe-central-heidenheim', city: 'Heidenheim', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'pizza-napoli-hdh@gastro.pistazz.io', password: 'PizzaNapoli2026!',
    name: 'Pizza Napoli Heidenheim', slug: 'pizza-napoli-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'krokodil-hdh@gastro.pistazz.io', password: 'Krokodil2026!',
    name: 'Restaurant Krokodil', slug: 'restaurant-krokodil-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: { ...woche('11:30', '22:00'), monday: closed },
  },
  {
    email: 'haus-der-sonne-hdh@gastro.pistazz.io', password: 'HausDerSonne2026!',
    name: 'Haus der Sonne', slug: 'haus-der-sonne-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'balaton-hdh@gastro.pistazz.io', password: 'Balaton2026!',
    name: 'Restaurant Balaton', slug: 'restaurant-balaton-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('12:00', '22:00'),
  },
  {
    email: 'stadtgarten-hdh@gastro.pistazz.io', password: 'Stadtgarten2026!',
    name: 'Stadtgarten Heidenheim', slug: 'stadtgarten-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00'), std('11:00', '22:00')),
  },
  {
    email: 'china-palast-hdh@gastro.pistazz.io', password: 'ChinaPalast2026!',
    name: 'China Palast Heidenheim', slug: 'china-palast-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'pizzeria-toscana-hdh@gastro.pistazz.io', password: 'PizzeriaToscana2026!',
    name: 'Pizzeria Toscana', slug: 'pizzeria-toscana-heidenheim', city: 'Heidenheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  // ── Schwäbisch Hall ────────────────────────────────────────────────────────
  {
    email: 'schupfnudel-sha@gastro.pistazz.io', password: 'Schupfnudel2026!',
    name: 'Schupfnudel Schwäbisch Hall', slug: 'schupfnudel-sha', city: 'Schwäbisch Hall', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'ristorante-sole-sha@gastro.pistazz.io', password: 'RistoranteSole2026!',
    name: 'Ristorante il Sole', slug: 'ristorante-sole-sha', city: 'Schwäbisch Hall', type: 'restaurant',
    opening_hours: woche('12:00', '22:30', std('12:00', '23:00')),
  },
  {
    email: 'zuckerbaeck-sha@gastro.pistazz.io', password: 'Zuckerbaeck2026!',
    name: 'Café Zuckerbäcker', slug: 'cafe-zuckerbackerei-sha', city: 'Schwäbisch Hall', type: 'cafe',
    opening_hours: woche('07:30', '18:00', std('07:30', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'kronenhof-sha@gastro.pistazz.io', password: 'Kronenhof2026!',
    name: 'Kronenhof Restaurant', slug: 'kronenhof-restaurant-sha', city: 'Schwäbisch Hall', type: 'restaurant',
    address: 'Am Markt 12, 74523 Schwäbisch Hall',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'zum-ritter-sha@gastro.pistazz.io', password: 'ZumRitter2026!',
    name: 'Gasthof Zum Ritter', slug: 'gasthof-zum-ritter-sha', city: 'Schwäbisch Hall', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), tuesday: closed },
  },
  {
    email: 'bauerncafe-sha@gastro.pistazz.io', password: 'Bauerncafe2026!',
    name: 'Bauernstube Café', slug: 'bauernstube-cafe-sha', city: 'Schwäbisch Hall', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  {
    email: 'pizzeria-vesuvio-sha@gastro.pistazz.io', password: 'Vesuvio2026!',
    name: 'Pizzeria Vesuvio SHA', slug: 'pizzeria-vesuvio-sha', city: 'Schwäbisch Hall', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'haller-brauhaus@gastro.pistazz.io', password: 'HallerBrauhaus2026!',
    name: 'Haller Brauhaus', slug: 'haller-brauhaus-sha', city: 'Schwäbisch Hall', type: 'bar',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00')),
  },
  // ── Crailsheim ─────────────────────────────────────────────────────────────
  {
    email: 'stadtcafe-crailsheim@gastro.pistazz.io', password: 'Stadtcafe2026!',
    name: 'Stadtcafé Crailsheim', slug: 'stadtcafe-crailsheim', city: 'Crailsheim', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'pizzeria-bella-vita-crailsheim@gastro.pistazz.io', password: 'BellaVita2026!',
    name: 'Pizzeria Bella Vita', slug: 'pizzeria-bella-vita-crailsheim', city: 'Crailsheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'china-wok-crailsheim@gastro.pistazz.io', password: 'ChinaWok2026!',
    name: 'China Wok Crailsheim', slug: 'china-wok-crailsheim', city: 'Crailsheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'brauerei-gasthof-crailsheim@gastro.pistazz.io', password: 'BrauereiGasthof2026!',
    name: 'Brauerei Gasthof', slug: 'brauerei-gasthof-crailsheim', city: 'Crailsheim', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'steakhouse-texas-crailsheim@gastro.pistazz.io', password: 'SteakhouseTexas2026!',
    name: 'Steakhouse Texas', slug: 'steakhouse-texas-crailsheim', city: 'Crailsheim', type: 'restaurant',
    opening_hours: woche('12:00', '22:30', std('12:00', '23:00')),
  },
  {
    email: 'yamas-crailsheim@gastro.pistazz.io', password: 'Yamas2026!',
    name: 'Yamas Griechisch', slug: 'yamas-griechisch-crailsheim', city: 'Crailsheim', type: 'restaurant',
    opening_hours: woche('12:00', '22:00'),
  },
  // ── Bopfingen ──────────────────────────────────────────────────────────────
  {
    email: 'steinbacher-hof-bopfingen@gastro.pistazz.io', password: 'SteinbacherHof2026!',
    name: 'Steinbacher Hof', slug: 'steinbacher-hof-bopfingen', city: 'Bopfingen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), tuesday: closed },
  },
  {
    email: 'pizzeria-sole-bopfingen@gastro.pistazz.io', password: 'PizzeriaSole2026!',
    name: 'Pizzeria Sole Bopfingen', slug: 'pizzeria-sole-bopfingen', city: 'Bopfingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'cafe-riess-bopfingen@gastro.pistazz.io', password: 'CafeRiess2026!',
    name: 'Café Riess', slug: 'cafe-riess-bopfingen', city: 'Bopfingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  // ── Nördlingen ─────────────────────────────────────────────────────────────
  {
    email: 'meyer-restaurant-noerdlingen@gastro.pistazz.io', password: 'MeyerRest2026!',
    name: 'Meyer Restaurant', slug: 'meyer-restaurant-noerdlingen', city: 'Nördlingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'cafe-am-markt-noerdlingen@gastro.pistazz.io', password: 'CafeAmMarkt2026!',
    name: 'Café am Markt Nördlingen', slug: 'cafe-am-markt-noerdlingen', city: 'Nördlingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'sternla-noerdlingen@gastro.pistazz.io', password: 'Sternla2026!',
    name: 'Sternla Nördlingen', slug: 'sternla-noerdlingen', city: 'Nördlingen', type: 'restaurant',
    address: 'Baldinger Str. 14, 86720 Nördlingen',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'altstadt-restaurant-noerdlingen@gastro.pistazz.io', password: 'Altstadt2026!',
    name: 'Altstadt Restaurant', slug: 'altstadt-restaurant-noerdlingen', city: 'Nördlingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Dinkelsbühl ────────────────────────────────────────────────────────────
  {
    email: 'blauer-hecht-dinkelsbuehl@gastro.pistazz.io', password: 'BlauerHecht2026!',
    name: 'Blauer Hecht', slug: 'blauer-hecht-dinkelsbuehl', city: 'Dinkelsbühl', type: 'restaurant',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'weisses-ross-dinkelsbuehl@gastro.pistazz.io', password: 'WeissesRoss2026!',
    name: 'Hotel Weißes Ross', slug: 'weisses-ross-dinkelsbuehl', city: 'Dinkelsbühl', type: 'hotel',
    opening_hours: woche('07:00', '22:00'),
  },
  {
    email: 'haus-appelberg-dinkelsbuehl@gastro.pistazz.io', password: 'Appelberg2026!',
    name: 'Haus Appelberg', slug: 'haus-appelberg-dinkelsbuehl', city: 'Dinkelsbühl', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Feuchtwangen ───────────────────────────────────────────────────────────
  {
    email: 'marktplatz-restaurant-feuchtwangen@gastro.pistazz.io', password: 'Marktplatz2026!',
    name: 'Marktplatz Restaurant', slug: 'marktplatz-restaurant-feuchtwangen', city: 'Feuchtwangen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'cafe-park-feuchtwangen@gastro.pistazz.io', password: 'CafePark2026!',
    name: 'Café am Park', slug: 'cafe-am-park-feuchtwangen', city: 'Feuchtwangen', type: 'cafe',
    opening_hours: woche('08:30', '18:00', std('08:30', '17:00')),
  },
  // ── Ansbach ────────────────────────────────────────────────────────────────
  {
    email: 'restaurant-park-ansbach@gastro.pistazz.io', password: 'RestPark2026!',
    name: 'Restaurant am Park Ansbach', slug: 'restaurant-am-park-ansbach', city: 'Ansbach', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'cafe-bohm-ansbach@gastro.pistazz.io', password: 'CafeBohm2026!',
    name: 'Café Böhm Ansbach', slug: 'cafe-bohm-ansbach', city: 'Ansbach', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'pizzeria-lago-ansbach@gastro.pistazz.io', password: 'PizzeriaLago2026!',
    name: 'Pizzeria Lago Ansbach', slug: 'pizzeria-lago-ansbach', city: 'Ansbach', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'kaiserhof-ansbach@gastro.pistazz.io', password: 'Kaiserhof2026!',
    name: 'Kaiserhof Ansbach', slug: 'kaiserhof-ansbach', city: 'Ansbach', type: 'restaurant',
    opening_hours: woche('11:00', '23:00'),
  },
  {
    email: 'china-lotus-ansbach@gastro.pistazz.io', password: 'ChinaLotus2026!',
    name: 'China Lotus Ansbach', slug: 'china-lotus-ansbach', city: 'Ansbach', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Gaildorf ───────────────────────────────────────────────────────────────
  {
    email: 'restaurant-gaildorf@gastro.pistazz.io', password: 'RestGaildorf2026!',
    name: 'Restaurant Gaildorf', slug: 'restaurant-gaildorf', city: 'Gaildorf', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-jagsttaler-gaildorf@gastro.pistazz.io', password: 'Jagsttaler2026!',
    name: 'Café Jagsttaler', slug: 'cafe-jagsttaler-gaildorf', city: 'Gaildorf', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  // ── Geislingen ─────────────────────────────────────────────────────────────
  {
    email: 'sonne-geislingen@gastro.pistazz.io', password: 'SonneGeislingen2026!',
    name: 'Gasthof Sonne Geislingen', slug: 'gasthof-sonne-geislingen', city: 'Geislingen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'pizzeria-mare-geislingen@gastro.pistazz.io', password: 'PizzeriaMare2026!',
    name: 'Pizzeria Mare Geislingen', slug: 'pizzeria-mare-geislingen', city: 'Geislingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'cafe-linde-geislingen@gastro.pistazz.io', password: 'CafeLinde2026!',
    name: 'Café Linde', slug: 'cafe-linde-geislingen', city: 'Geislingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  // ── Kirchheim unter Teck ───────────────────────────────────────────────────
  {
    email: 'alte-muehle-kirchheim@gastro.pistazz.io', password: 'AlteMuehle2026!',
    name: 'Alte Mühle Restaurant', slug: 'alte-muehle-kirchheim', city: 'Kirchheim unter Teck', type: 'restaurant',
    opening_hours: { ...woche('11:30', '22:00'), monday: closed },
  },
  {
    email: 'pizza-toni-kirchheim@gastro.pistazz.io', password: 'PizzaToni2026!',
    name: 'Pizza Toni Kirchheim', slug: 'pizza-toni-kirchheim', city: 'Kirchheim unter Teck', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'cafe-milani-kirchheim@gastro.pistazz.io', password: 'CafeMilani2026!',
    name: 'Café Milani', slug: 'cafe-milani-kirchheim', city: 'Kirchheim unter Teck', type: 'cafe',
    opening_hours: woche('08:00', '19:00', std('08:00', '18:00'), std('09:00', '17:00')),
  },
  // ── Göppingen ──────────────────────────────────────────────────────────────
  {
    email: 'brauhaus-goeppingen@gastro.pistazz.io', password: 'BrauhausGP2026!',
    name: 'Brauhaus Göppingen', slug: 'brauhaus-goeppingen', city: 'Göppingen', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00')),
  },
  {
    email: 'ristorante-bellavista-gp@gastro.pistazz.io', password: 'BellaVista2026!',
    name: 'Ristorante Bella Vista', slug: 'ristorante-bellavista-gp', city: 'Göppingen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'cafe-zentral-gp@gastro.pistazz.io', password: 'CafeZentral2026!',
    name: 'Café Zentral Göppingen', slug: 'cafe-zentral-gp', city: 'Göppingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'siam-palace-gp@gastro.pistazz.io', password: 'SiamPalace2026!',
    name: 'Siam Palace Thai', slug: 'siam-palace-gp', city: 'Göppingen', type: 'restaurant',
    opening_hours: { ...woche('12:00', '22:00'), monday: closed },
  },
  {
    email: 'gasthof-hirsch-gp@gastro.pistazz.io', password: 'GasthofHirsch2026!',
    name: 'Gasthof Hirsch Göppingen', slug: 'gasthof-hirsch-gp', city: 'Göppingen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'delphi-griechisch-gp@gastro.pistazz.io', password: 'Delphi2026!',
    name: 'Delphi Griechisch', slug: 'delphi-griechisch-gp', city: 'Göppingen', type: 'restaurant',
    opening_hours: woche('12:00', '22:30'),
  },
  // ── Ulm ────────────────────────────────────────────────────────────────────
  {
    email: 'zur-forelle-ulm@gastro.pistazz.io', password: 'ZurForelle2026!',
    name: 'Zur Forelle Ulm', slug: 'zur-forelle-ulm', city: 'Ulm', type: 'restaurant',
    address: 'Fischergasse 25, 89073 Ulm',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'einstein-cafe-ulm@gastro.pistazz.io', password: 'EinsteinCafe2026!',
    name: 'Einstein Café Ulm', slug: 'einstein-cafe-ulm', city: 'Ulm', type: 'cafe',
    opening_hours: woche('08:00', '20:00', std('08:00', '19:00'), std('09:00', '19:00')),
  },
  {
    email: 'donau-restaurant-ulm@gastro.pistazz.io', password: 'DonauRest2026!',
    name: 'Donau Restaurant', slug: 'donau-restaurant-ulm', city: 'Ulm', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'muensterplatz-bistro-ulm@gastro.pistazz.io', password: 'MuensterBistro2026!',
    name: 'Münsterplatz Bistro', slug: 'muensterplatz-bistro-ulm', city: 'Ulm', type: 'bistro',
    opening_hours: woche('09:00', '22:00', std('09:00', '23:00')),
  },
  {
    email: 'zum-anker-ulm@gastro.pistazz.io', password: 'ZumAnker2026!',
    name: 'Zum Anker Ulm', slug: 'zum-anker-ulm', city: 'Ulm', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'fischhaus-ulm@gastro.pistazz.io', password: 'Fischhaus2026!',
    name: 'Fischhaus Ulm', slug: 'fischhaus-ulm', city: 'Ulm', type: 'restaurant',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'pizzeria-capri-ulm@gastro.pistazz.io', password: 'PizzeriaCapri2026!',
    name: 'Pizzeria Capri Ulm', slug: 'pizzeria-capri-ulm', city: 'Ulm', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'thai-garden-ulm@gastro.pistazz.io', password: 'ThaiGardenUlm2026!',
    name: 'Thai Garden Ulm', slug: 'thai-garden-ulm', city: 'Ulm', type: 'restaurant',
    opening_hours: { ...woche('12:00', '22:00'), tuesday: closed },
  },
  // ── Neu-Ulm ────────────────────────────────────────────────────────────────
  {
    email: 'city-grill-neu-ulm@gastro.pistazz.io', password: 'CityGrill2026!',
    name: 'City Grill Neu-Ulm', slug: 'city-grill-neu-ulm', city: 'Neu-Ulm', type: 'restaurant',
    opening_hours: woche('11:00', '22:00', std('11:00', '23:00')),
  },
  {
    email: 'cafe-donau-neu-ulm@gastro.pistazz.io', password: 'CafeDonau2026!',
    name: 'Café Donauufer', slug: 'cafe-donauufer-neu-ulm', city: 'Neu-Ulm', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'la-cucina-neu-ulm@gastro.pistazz.io', password: 'LaCucina2026!',
    name: 'La Cucina Italiana', slug: 'la-cucina-neu-ulm', city: 'Neu-Ulm', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  // ── Giengen ────────────────────────────────────────────────────────────────
  {
    email: 'brenz-restaurant-giengen@gastro.pistazz.io', password: 'BrenzRest2026!',
    name: 'Brenz Restaurant Giengen', slug: 'brenz-restaurant-giengen', city: 'Giengen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'ristorante-florenz-giengen@gastro.pistazz.io', password: 'Florenz2026!',
    name: 'Ristorante Florenz', slug: 'ristorante-florenz-giengen', city: 'Giengen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00'),
  },
  // ── Königsbronn ────────────────────────────────────────────────────────────
  {
    email: 'zum-schweizer-koenigsbronn@gastro.pistazz.io', password: 'ZumSchweizer2026!',
    name: 'Gasthof Zum Schweizer', slug: 'zum-schweizer-koenigsbronn', city: 'Königsbronn', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Lauchheim ──────────────────────────────────────────────────────────────
  {
    email: 'burgermeister-lauchheim@gastro.pistazz.io', password: 'Burgermeister2026!',
    name: 'Bürgermeister Stüble', slug: 'buergermeister-stuebele-lauchheim', city: 'Lauchheim', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed },
  },
  // ── Essingen ───────────────────────────────────────────────────────────────
  {
    email: 'landgasthof-essingen@gastro.pistazz.io', password: 'Landgasthof2026!',
    name: 'Landgasthof Essingen', slug: 'landgasthof-essingen', city: 'Essingen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed, tuesday: closed },
  },
  // ── Oberkochen ─────────────────────────────────────────────────────────────
  {
    email: 'brauerei-oberkochen@gastro.pistazz.io', password: 'BrauereiOberkochen2026!',
    name: 'Brauerei Restaurant Oberkochen', slug: 'brauerei-restaurant-oberkochen', city: 'Oberkochen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00', std('11:00', '23:00')),
  },
  {
    email: 'cafe-am-see-oberkochen@gastro.pistazz.io', password: 'CafeAmSee2026!',
    name: 'Café am See', slug: 'cafe-am-see-oberkochen', city: 'Oberkochen', type: 'cafe',
    opening_hours: woche('09:00', '18:00', std('09:00', '17:00')),
  },
  // ── Rainau ─────────────────────────────────────────────────────────────────
  {
    email: 'seegasthof-rainau@gastro.pistazz.io', password: 'Seegasthof2026!',
    name: 'Seegasthof Rainau', slug: 'seegasthof-rainau', city: 'Rainau', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed, tuesday: closed },
  },
  // ── Adelmannsfelden ────────────────────────────────────────────────────────
  {
    email: 'gasthof-hirsch-adelmannsfelden@gastro.pistazz.io', password: 'HirschAdel2026!',
    name: 'Gasthof Hirsch Adelmannsfelden', slug: 'gasthof-hirsch-adelmannsfelden', city: 'Adelmannsfelden', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed, wednesday: closed },
  },
  // ── Westhausen ─────────────────────────────────────────────────────────────
  {
    email: 'landhaus-westhausen@gastro.pistazz.io', password: 'Landhaus2026!',
    name: 'Landhaus Westhausen', slug: 'landhaus-westhausen', city: 'Westhausen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  // ── Böbingen ───────────────────────────────────────────────────────────────
  {
    email: 'mainhardter-stub-boebingen@gastro.pistazz.io', password: 'MainhardterStub2026!',
    name: 'Mainhardter Stube', slug: 'mainhardter-stube-boebingen', city: 'Böbingen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Alfdorf ────────────────────────────────────────────────────────────────
  {
    email: 'waldrestaurant-alfdorf@gastro.pistazz.io', password: 'Waldrestaurant2026!',
    name: 'Waldrestaurant Alfdorf', slug: 'waldrestaurant-alfdorf', city: 'Alfdorf', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Lorch ──────────────────────────────────────────────────────────────────
  {
    email: 'restaurant-remstal-lorch@gastro.pistazz.io', password: 'Remstal2026!',
    name: 'Remstal Restaurant Lorch', slug: 'remstal-restaurant-lorch', city: 'Lorch', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'pizza-lorch@gastro.pistazz.io', password: 'PizzaLorch2026!',
    name: 'Pizza Lorch', slug: 'pizza-lorch', city: 'Lorch', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Mutlangen ──────────────────────────────────────────────────────────────
  {
    email: 'gasthof-mutlangen@gastro.pistazz.io', password: 'GasthofMutlangen2026!',
    name: 'Gasthof Mutlangen', slug: 'gasthof-mutlangen', city: 'Mutlangen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  // ── Waldstetten ────────────────────────────────────────────────────────────
  {
    email: 'landgasthof-waldstetten@gastro.pistazz.io', password: 'LandgasthofWaldstetten2026!',
    name: 'Landgasthof Waldstetten', slug: 'landgasthof-waldstetten', city: 'Waldstetten', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Spraitbach ─────────────────────────────────────────────────────────────
  {
    email: 'rebstock-spraitbach@gastro.pistazz.io', password: 'Rebstock2026!',
    name: 'Rebstock Spraitbach', slug: 'rebstock-spraitbach', city: 'Spraitbach', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  // ── Durlangen ──────────────────────────────────────────────────────────────
  {
    email: 'gasthaus-krone-durlangen@gastro.pistazz.io', password: 'KroneDurlangen2026!',
    name: 'Gasthaus Krone Durlangen', slug: 'gasthaus-krone-durlangen', city: 'Durlangen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Heubach ────────────────────────────────────────────────────────────────
  {
    email: 'bergkoch-heubach@gastro.pistazz.io', password: 'Bergkoch2026!',
    name: 'Bergkoch Heubach', slug: 'bergkoch-heubach', city: 'Heubach', type: 'restaurant',
    opening_hours: { ...woche('12:00', '22:00'), monday: closed },
  },
  {
    email: 'pizzeria-vesuvio-heubach@gastro.pistazz.io', password: 'VesuvioHeubach2026!',
    name: 'Pizzeria Vesuvio Heubach', slug: 'pizzeria-vesuvio-heubach', city: 'Heubach', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Bartholomä ─────────────────────────────────────────────────────────────
  {
    email: 'berggasthof-bartholomae@gastro.pistazz.io', password: 'BerggasthofBar2026!',
    name: 'Berggasthof Bartholomä', slug: 'berggasthof-bartholomae', city: 'Bartholomä', type: 'restaurant',
    opening_hours: { ...woche('11:00', '20:00'), monday: closed, tuesday: closed },
  },
  // ── Deggingen ──────────────────────────────────────────────────────────────
  {
    email: 'restaurant-filstal-deggingen@gastro.pistazz.io', password: 'RestFilstal2026!',
    name: 'Restaurant Filstal', slug: 'restaurant-filstal-deggingen', city: 'Deggingen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed },
  },
  // ── Donzdorf ───────────────────────────────────────────────────────────────
  {
    email: 'cafe-schloss-donzdorf@gastro.pistazz.io', password: 'CafeSchloss2026!',
    name: 'Café Schloss Donzdorf', slug: 'cafe-schloss-donzdorf', city: 'Donzdorf', type: 'cafe',
    opening_hours: woche('09:00', '18:00', std('09:00', '17:00')),
  },
  {
    email: 'gasthof-ritter-donzdorf@gastro.pistazz.io', password: 'GasthofRitter2026!',
    name: 'Gasthof Ritter Donzdorf', slug: 'gasthof-ritter-donzdorf', city: 'Donzdorf', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  // ── Süßen ──────────────────────────────────────────────────────────────────
  {
    email: 'pizza-pronto-suessen@gastro.pistazz.io', password: 'PizzaPronto2026!',
    name: 'Pizza Pronto Süßen', slug: 'pizza-pronto-suessen', city: 'Süßen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'cafe-kreuz-suessen@gastro.pistazz.io', password: 'CafeKreuz2026!',
    name: 'Café Kreuz Süßen', slug: 'cafe-kreuz-suessen', city: 'Süßen', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  // ── Bad Urach ──────────────────────────────────────────────────────────────
  {
    email: 'kurhotel-restaurant-bad-urach@gastro.pistazz.io', password: 'KurhotelRest2026!',
    name: 'Kurhotel Restaurant Bad Urach', slug: 'kurhotel-restaurant-bad-urach', city: 'Bad Urach', type: 'hotel',
    opening_hours: woche('07:00', '22:00'),
  },
  {
    email: 'gasthof-sonne-bad-urach@gastro.pistazz.io', password: 'SonneBadUrach2026!',
    name: 'Gasthof Sonne Bad Urach', slug: 'gasthof-sonne-bad-urach', city: 'Bad Urach', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  {
    email: 'pizzeria-amalfi-bad-urach@gastro.pistazz.io', password: 'Amalfi2026!',
    name: 'Pizzeria Amalfi', slug: 'pizzeria-amalfi-bad-urach', city: 'Bad Urach', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Wiesensteig ────────────────────────────────────────────────────────────
  {
    email: 'gasthaus-zur-linde-wiesensteig@gastro.pistazz.io', password: 'ZurLinde2026!',
    name: 'Gasthaus Zur Linde', slug: 'gasthaus-zur-linde-wiesensteig', city: 'Wiesensteig', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Münsingen ──────────────────────────────────────────────────────────────
  {
    email: 'restaurant-schwanen-muensingen@gastro.pistazz.io', password: 'Schwanen2026!',
    name: 'Restaurant Schwanen', slug: 'restaurant-schwanen-muensingen', city: 'Münsingen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-museum-muensingen@gastro.pistazz.io', password: 'CafeMuseum2026!',
    name: 'Café Museum Münsingen', slug: 'cafe-museum-muensingen', city: 'Münsingen', type: 'cafe',
    opening_hours: woche('09:00', '17:00', std('09:00', '16:00')),
  },
  // ── Ehingen ────────────────────────────────────────────────────────────────
  {
    email: 'kaiserstuben-ehingen@gastro.pistazz.io', password: 'Kaiserstuben2026!',
    name: 'Kaiserstuben Ehingen', slug: 'kaiserstuben-ehingen', city: 'Ehingen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'pizzeria-la-grotta-ehingen@gastro.pistazz.io', password: 'LaGrotta2026!',
    name: 'Pizzeria La Grotta', slug: 'pizzeria-la-grotta-ehingen', city: 'Ehingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'cafe-donaupark-ehingen@gastro.pistazz.io', password: 'DonauPark2026!',
    name: 'Café Donaupark', slug: 'cafe-donaupark-ehingen', city: 'Ehingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  // ── Laupheim ───────────────────────────────────────────────────────────────
  {
    email: 'stadtbrauerei-laupheim@gastro.pistazz.io', password: 'Stadtbrauerei2026!',
    name: 'Stadtbrauerei Laupheim', slug: 'stadtbrauerei-laupheim', city: 'Laupheim', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00')),
  },
  {
    email: 'pizza-napoli-laupheim@gastro.pistazz.io', password: 'PizzaNapoliLH2026!',
    name: 'Pizza Napoli Laupheim', slug: 'pizza-napoli-laupheim', city: 'Laupheim', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Biberach ───────────────────────────────────────────────────────────────
  {
    email: 'schussenrieder-krug-biberach@gastro.pistazz.io', password: 'SchussenriederKrug2026!',
    name: 'Schussenrieder Krug', slug: 'schussenrieder-krug-biberach', city: 'Biberach', type: 'restaurant',
    opening_hours: woche('11:00', '23:00', std('11:00', '00:00')),
  },
  {
    email: 'cafe-schoetz-biberach@gastro.pistazz.io', password: 'CafeSchoetz2026!',
    name: 'Café Schötz', slug: 'cafe-schoetz-biberach', city: 'Biberach', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00'), std('09:00', '17:00')),
  },
  {
    email: 'trattoria-la-dolce-vita-biberach@gastro.pistazz.io', password: 'LaDolceVita2026!',
    name: 'Trattoria La Dolce Vita', slug: 'trattoria-la-dolce-vita-biberach', city: 'Biberach', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'gasthaus-adler-biberach@gastro.pistazz.io', password: 'GasthausAdler2026!',
    name: 'Gasthaus Adler Biberach', slug: 'gasthaus-adler-biberach', city: 'Biberach', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
  // ── Ravensburg ─────────────────────────────────────────────────────────────
  {
    email: 'hasen-restaurant-ravensburg@gastro.pistazz.io', password: 'HasenRest2026!',
    name: 'Hasen Restaurant Ravensburg', slug: 'hasen-restaurant-ravensburg', city: 'Ravensburg', type: 'restaurant',
    address: 'Marienplatz 6, 88212 Ravensburg',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'cafe-weyule-ravensburg@gastro.pistazz.io', password: 'CafeWeyule2026!',
    name: 'Café Weyule', slug: 'cafe-weyule-ravensburg', city: 'Ravensburg', type: 'cafe',
    opening_hours: woche('08:00', '19:00', std('08:00', '18:00'), std('09:00', '18:00')),
  },
  {
    email: 'pizzeria-capri-ravensburg@gastro.pistazz.io', password: 'CapriRavensburg2026!',
    name: 'Pizzeria Capri Ravensburg', slug: 'pizzeria-capri-ravensburg', city: 'Ravensburg', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'gasthaus-obertor-ravensburg@gastro.pistazz.io', password: 'GasthausObertor2026!',
    name: 'Gasthaus Obertor', slug: 'gasthaus-obertor-ravensburg', city: 'Ravensburg', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  // ── Friedrichshafen ────────────────────────────────────────────────────────
  {
    email: 'seerestaurant-fdh@gastro.pistazz.io', password: 'Seerestaurant2026!',
    name: 'Seerestaurant Friedrichshafen', slug: 'seerestaurant-fdh', city: 'Friedrichshafen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'zeppelin-bistro-fdh@gastro.pistazz.io', password: 'ZeppelinBistro2026!',
    name: 'Zeppelin Bistro', slug: 'zeppelin-bistro-fdh', city: 'Friedrichshafen', type: 'bistro',
    opening_hours: woche('09:00', '22:00', std('09:00', '23:00'), std('10:00', '21:00')),
  },
  {
    email: 'cafe-bodensee-fdh@gastro.pistazz.io', password: 'CafeBodensee2026!',
    name: 'Café Bodensee', slug: 'cafe-bodensee-fdh', city: 'Friedrichshafen', type: 'cafe',
    opening_hours: woche('08:00', '19:00', std('08:00', '18:00'), std('09:00', '18:00')),
  },
  {
    email: 'restaurant-graf-zeppelin-fdh@gastro.pistazz.io', password: 'GrafZeppelin2026!',
    name: 'Restaurant Graf Zeppelin', slug: 'restaurant-graf-zeppelin-fdh', city: 'Friedrichshafen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Konstanz ───────────────────────────────────────────────────────────────
  {
    email: 'konzil-konstanz@gastro.pistazz.io', password: 'Konzil2026!',
    name: 'Restaurant Konzil', slug: 'restaurant-konzil-konstanz', city: 'Konstanz', type: 'restaurant',
    address: 'Hafenstraße 2, 78462 Konstanz',
    opening_hours: woche('11:30', '22:00', std('11:30', '23:00')),
  },
  {
    email: 'cafe-rheingold-konstanz@gastro.pistazz.io', password: 'Rheingold2026!',
    name: 'Café Rheingold', slug: 'cafe-rheingold-konstanz', city: 'Konstanz', type: 'cafe',
    opening_hours: woche('08:00', '20:00', std('08:00', '19:00'), std('09:00', '19:00')),
  },
  {
    email: 'pizzeria-seeblick-konstanz@gastro.pistazz.io', password: 'PizzeriaSeeblick2026!',
    name: 'Pizzeria Seeblick', slug: 'pizzeria-seeblick-konstanz', city: 'Konstanz', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  // ── Wangen im Allgäu ───────────────────────────────────────────────────────
  {
    email: 'pfauen-wangen@gastro.pistazz.io', password: 'Pfauen2026!',
    name: 'Hotel Restaurant Pfauen', slug: 'hotel-restaurant-pfauen-wangen', city: 'Wangen im Allgäu', type: 'hotel',
    opening_hours: woche('07:00', '22:00'),
  },
  {
    email: 'pizzeria-wangen@gastro.pistazz.io', password: 'PizzeriaWangen2026!',
    name: 'Pizzeria Wangen', slug: 'pizzeria-wangen', city: 'Wangen im Allgäu', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Leutkirch ──────────────────────────────────────────────────────────────
  {
    email: 'restaurant-waldsee-leutkirch@gastro.pistazz.io', password: 'Waldsee2026!',
    name: 'Restaurant Waldsee', slug: 'restaurant-waldsee-leutkirch', city: 'Leutkirch', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-zur-post-leutkirch@gastro.pistazz.io', password: 'ZurPost2026!',
    name: 'Café Zur Post', slug: 'cafe-zur-post-leutkirch', city: 'Leutkirch', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  // ── Isny ───────────────────────────────────────────────────────────────────
  {
    email: 'gasthof-zum-hirsch-isny@gastro.pistazz.io', password: 'ZumHirschIsny2026!',
    name: 'Gasthof Zum Hirsch Isny', slug: 'gasthof-zum-hirsch-isny', city: 'Isny', type: 'restaurant',
    opening_hours: { ...woche('11:00', '21:00'), monday: closed, tuesday: closed },
  },
  // ── Bad Waldsee ────────────────────────────────────────────────────────────
  {
    email: 'klinik-restaurant-bad-waldsee@gastro.pistazz.io', password: 'KlinikRest2026!',
    name: 'Restaurant Bad Waldsee', slug: 'restaurant-bad-waldsee', city: 'Bad Waldsee', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-seepromenade-bad-waldsee@gastro.pistazz.io', password: 'Seepromenade2026!',
    name: 'Café Seepromenade', slug: 'cafe-seepromenade-bad-waldsee', city: 'Bad Waldsee', type: 'cafe',
    opening_hours: woche('09:00', '18:00', std('09:00', '17:00')),
  },
  // ── Weingarten ─────────────────────────────────────────────────────────────
  {
    email: 'restaurant-konig-karl-weingarten@gastro.pistazz.io', password: 'KonigKarl2026!',
    name: 'Restaurant König Karl', slug: 'restaurant-koenig-karl-weingarten', city: 'Weingarten', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'pizzeria-basilicata-weingarten@gastro.pistazz.io', password: 'Basilicata2026!',
    name: 'Pizzeria Basilicata', slug: 'pizzeria-basilicata-weingarten', city: 'Weingarten', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  // ── Sigmaringen ────────────────────────────────────────────────────────────
  {
    email: 'restaurant-hohenzollern-sigmaringen@gastro.pistazz.io', password: 'Hohenzollern2026!',
    name: 'Restaurant Hohenzollern', slug: 'restaurant-hohenzollern-sigmaringen', city: 'Sigmaringen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  {
    email: 'cafe-am-schloss-sigmaringen@gastro.pistazz.io', password: 'CafeAmSchloss2026!',
    name: 'Café am Schloss', slug: 'cafe-am-schloss-sigmaringen', city: 'Sigmaringen', type: 'cafe',
    opening_hours: woche('09:00', '18:00', std('09:00', '17:00')),
  },
  {
    email: 'ristorante-lago-sigmaringen@gastro.pistazz.io', password: 'RistoranteLago2026!',
    name: 'Ristorante Lago', slug: 'ristorante-lago-sigmaringen', city: 'Sigmaringen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  // ── Albstadt ───────────────────────────────────────────────────────────────
  {
    email: 'restaurant-zollernalb-albstadt@gastro.pistazz.io', password: 'Zollernalb2026!',
    name: 'Restaurant Zollernalb', slug: 'restaurant-zollernalb-albstadt', city: 'Albstadt', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-alb-albstadt@gastro.pistazz.io', password: 'CafeAlb2026!',
    name: 'Café Alb', slug: 'cafe-alb-albstadt', city: 'Albstadt', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  {
    email: 'pizzeria-tivoli-albstadt@gastro.pistazz.io', password: 'Tivoli2026!',
    name: 'Pizzeria Tivoli', slug: 'pizzeria-tivoli-albstadt', city: 'Albstadt', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Balingen ───────────────────────────────────────────────────────────────
  {
    email: 'weinstube-balingen@gastro.pistazz.io', password: 'Weinstube2026!',
    name: 'Weinstube Balingen', slug: 'weinstube-balingen', city: 'Balingen', type: 'restaurant',
    opening_hours: woche('12:00', '22:00', std('12:00', '23:00')),
  },
  {
    email: 'cafe-steinlach-balingen@gastro.pistazz.io', password: 'Steinlach2026!',
    name: 'Café Steinlach', slug: 'cafe-steinlach-balingen', city: 'Balingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  {
    email: 'trattoria-napoli-balingen@gastro.pistazz.io', password: 'TrattoriaNapoli2026!',
    name: 'Trattoria Napoli Balingen', slug: 'trattoria-napoli-balingen', city: 'Balingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  // ── Rottweil ───────────────────────────────────────────────────────────────
  {
    email: 'kapuziner-rottweil@gastro.pistazz.io', password: 'Kapuziner2026!',
    name: 'Restaurant Kapuziner', slug: 'restaurant-kapuziner-rottweil', city: 'Rottweil', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-am-hochturm-rottweil@gastro.pistazz.io', password: 'Hochturm2026!',
    name: 'Café am Hochturm', slug: 'cafe-am-hochturm-rottweil', city: 'Rottweil', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'pizzeria-florenz-rottweil@gastro.pistazz.io', password: 'FlorenzRottweil2026!',
    name: 'Pizzeria Florenz Rottweil', slug: 'pizzeria-florenz-rottweil', city: 'Rottweil', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  // ── Tuttlingen ─────────────────────────────────────────────────────────────
  {
    email: 'donau-stuben-tuttlingen@gastro.pistazz.io', password: 'DonauStuben2026!',
    name: 'Donau-Stuben Tuttlingen', slug: 'donau-stuben-tuttlingen', city: 'Tuttlingen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-central-tuttlingen@gastro.pistazz.io', password: 'CafeCentralTutt2026!',
    name: 'Café Central Tuttlingen', slug: 'cafe-central-tuttlingen', city: 'Tuttlingen', type: 'cafe',
    opening_hours: woche('08:00', '18:00'),
  },
  {
    email: 'pizza-sole-tuttlingen@gastro.pistazz.io', password: 'PizzaSoleTutt2026!',
    name: 'Pizza Sole Tuttlingen', slug: 'pizza-sole-tuttlingen', city: 'Tuttlingen', type: 'restaurant',
    opening_hours: woche('11:30', '22:00'),
  },
  // ── Villingen-Schwenningen ─────────────────────────────────────────────────
  {
    email: 'bickel-restaurant-vs@gastro.pistazz.io', password: 'Bickel2026!',
    name: 'Bickel Restaurant', slug: 'bickel-restaurant-vs', city: 'Villingen-Schwenningen', type: 'restaurant',
    opening_hours: woche('11:00', '22:00'),
  },
  {
    email: 'cafe-stadtgarten-vs@gastro.pistazz.io', password: 'CafeStadtgarten2026!',
    name: 'Café Stadtgarten VS', slug: 'cafe-stadtgarten-vs', city: 'Villingen-Schwenningen', type: 'cafe',
    opening_hours: woche('08:00', '18:00', std('08:00', '17:00')),
  },
  {
    email: 'pizzeria-portofino-vs@gastro.pistazz.io', password: 'Portofino2026!',
    name: 'Pizzeria Portofino', slug: 'pizzeria-portofino-vs', city: 'Villingen-Schwenningen', type: 'restaurant',
    opening_hours: woche('11:30', '22:30'),
  },
  {
    email: 'schwarzwaldgasthof-vs@gastro.pistazz.io', password: 'Schwarzwaldgasthof2026!',
    name: 'Schwarzwaldgasthof', slug: 'schwarzwaldgasthof-vs', city: 'Villingen-Schwenningen', type: 'restaurant',
    opening_hours: { ...woche('11:00', '22:00'), monday: closed },
  },
]

export async function seedAll() {
  const admin = createAdminClient()

  // Fetch all existing slugs
  const { data: existing } = await admin.from('restaurants').select('slug')
  const existingSlugs = new Set((existing ?? []).map(r => r.slug))
  console.log(`Found ${existingSlugs.size} existing restaurants — skipping those.`)

  let created = 0, skipped = 0, errors = 0

  for (const r of NEW_RESTAURANTS) {
    if (existingSlugs.has(r.slug)) {
      console.log(`  SKIP  ${r.slug}`)
      skipped++
      continue
    }

    console.log(`  SEED  ${r.name} (${r.city})`)

    try {
      // 1) Create auth user
      let userId: string
      const { data: created_user, error: createErr } = await admin.auth.admin.createUser({
        email: r.email,
        password: r.password,
        email_confirm: true,
        user_metadata: { full_name: r.name },
      })

      if (createErr) {
        if (createErr.message?.includes('already') || (createErr as { code?: string }).code === 'email_exists') {
          const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
          const existing_user = users.find(u => u.email === r.email)
          if (!existing_user) throw new Error(`User ${r.email} not found after duplicate error`)
          userId = existing_user.id
          await admin.auth.admin.updateUserById(userId, { password: r.password })
        } else {
          throw createErr
        }
      } else {
        userId = created_user.user.id
      }

      // 2) Upsert profile
      await admin.from('profiles').upsert({
        id: userId,
        full_name: r.name,
        role: 'restaurant_owner',
        onboarding_completed: true,
      }, { onConflict: 'id' })
      await admin.from('profiles').update({ role: 'restaurant_owner', onboarding_completed: true }).eq('id', userId)

      // 3) Insert restaurant
      const { error: insertErr } = await admin.from('restaurants').insert({
        name: r.name,
        slug: r.slug,
        type: r.type,
        city: r.city,
        address: r.address ?? null,
        phone: r.phone ?? null,
        website: r.website ?? null,
        owner_id: userId,
        is_active: false,
        primary_color: '#8BB06A',
        points_per_story: 500,
        opening_hours: r.opening_hours,
      })
      if (insertErr) throw insertErr

      created++
      existingSlugs.add(r.slug)
    } catch (e: unknown) {
      console.error(`  ERROR ${r.slug}: ${(e as Error).message}`)
      errors++
    }
  }

  // Final pass: ensure every restaurant owner has the correct role
  // (Supabase DB trigger may have overwritten with 'guest' after user creation)
  const { data: allOwners } = await admin.from('restaurants').select('owner_id')
  const ownerIds = [...new Set((allOwners ?? []).map(r => r.owner_id).filter(Boolean))]
  if (ownerIds.length > 0) {
    await admin.from('profiles').update({ role: 'restaurant_owner' }).in('id', ownerIds).neq('role', 'restaurant_owner')
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`)
}

seedAll().catch(console.error)
