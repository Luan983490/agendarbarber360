/**
 * Converts a string into a URL-friendly slug.
 * Example: "Barbearia do João" → "barbearia-do-joao"
 */
export function toSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
