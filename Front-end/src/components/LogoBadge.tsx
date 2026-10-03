import { useState } from "react";

const LOGO_MAP: Record<string, string> = {
  "Safran Aircraft Engines": "safran-group.com",
  "Renault Group": "renault.com",
  "Inventiv IT": "inventivit.com",
  "CY Tech": "cyu.fr",
  "Université de Lille": "univ-lille.fr",
};

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface Props {
  name: string;
  size?: number;
}

export function LogoBadge({ name, size = 40 }: Props) {
  const domain = LOGO_MAP[name];
  const [failed, setFailed] = useState(false);

  const cls = `shrink-0 rounded-xl border border-line bg-surface object-contain p-1`;

  if (domain && !failed) {
    return (
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={name}
        width={size}
        height={size}
        className={cls}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className="grid shrink-0 place-items-center rounded-xl border border-line bg-surface font-mono text-xs font-semibold text-muted"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}
