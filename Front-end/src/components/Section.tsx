import type { ReactNode } from "react";

interface Props {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export function Section({ id, index, eyebrow, title, intro, children }: Props) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="container-page pt-24">
      <p className="eyebrow">
        {index} — {eyebrow}
      </p>
      <h2 id={`${id}-title`} className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
