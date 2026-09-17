// Storage-Bilder unter der eigenen Domain ausliefern (Rewrite /media/* in
// next.config.ts). Niemand soll je eine *.supabase.co-Adresse sehen - weder
// in der Adresszeile noch beim Teilen eines Links.

const STORAGE_PUBLIC = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/`

/** Fuer die Anzeige im Client: Supabase-URL -> relative /media/-URL. */
export function brandedMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (STORAGE_PUBLIC.length > 40 && url.startsWith(STORAGE_PUBLIC)) {
    return `/media/${url.slice(STORAGE_PUBLIC.length)}`
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
