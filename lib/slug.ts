// Restaurant-Slug = Login-Name des Inhabers (slug@gastro.pistazz.io) und URL.
// Client und Server nutzen dieselbe Funktion.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöüß]/g, c => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' } as Record<string, string>)[c] ?? c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
