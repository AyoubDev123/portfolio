/** Pastille d'initiales pour une entreprise ou une école.
 *
 * Pas de service de logos tiers : Clearbit (utilisé auparavant) a fermé son API
 * gratuite, les favicons ne sont servies que par une minorité de domaines et en
 * 32 px, et toute image distante expose l'IP des visiteurs à un tiers.
 */

// Mots qui ne portent pas l'identité : « University of Lille » doit donner UL, pas UO.
const STOPWORDS = new Set([
  "de", "du", "des", "la", "le", "les", "et", "d", "l",
  "of", "the", "and", "for",
]);

function initials(name: string): string {
  const words = name
    .split(/[\s\-–—&']+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()) && /\p{L}/u.test(w));
  const picked = words.length ? words : name.split(/\s+/).filter(Boolean);
  return picked
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Teinte stable dérivée du nom : chaque organisation garde la même couleur. */
function hue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

interface Props {
  name: string;
  size?: number;
}

export function LogoBadge({ name, size = 40 }: Props) {
  const h = hue(name);
  return (
    <span
      aria-label={name}
      className="grid shrink-0 place-items-center rounded-xl border font-mono font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.34),
        color: `oklch(0.52 0.12 ${h})`,
        background: `oklch(0.95 0.035 ${h})`,
        borderColor: `oklch(0.86 0.05 ${h})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
