// Storage-Bilder unter der eigenen Domain ausliefern (Rewrite /media/* in
// next.config.ts). Niemand soll je eine *.supabase.co-Adresse sehen - weder
// in der Adresszeile noch beim Teilen eines Links.

// Beide Prefixe abdecken: Altbestand in der DB traegt noch die direkte
// supabase.co-Adresse, Neues laeuft ueber die Custom Domain.
const STORAGE_PREFIXES = [
  `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`,
  'https://drvhdrhyjbyjilaxuxjy.supabase.co/storage/v1/object/public/',
]

/** Fuer die Anzeige im Client: Storage-URL -> relative /media/-URL. */
export function brandedMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  for (const prefix of STORAGE_PREFIXES) {
    if (prefix.length > 40 && url.startsWith(prefix)) {
      return `/media/${url.slice(prefix.length)}`
    }
  }
  return url
}

/** Fuer das Speichern in der DB (Server): absolute URL unter eigener Domain,
 *  damit auch externe Abrufe (z.B. KI-Bildpruefung) funktionieren. */
export function brandedMediaUrlAbsolute(url: string): string {
  const rel = brandedMediaUrl(url)
  if (rel && rel.startsWith('/media/')) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gastro.pistazz.io'
    return `${base}${rel}`
  }
  return url
}
