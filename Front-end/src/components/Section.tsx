import { type ReactNode } from "react";
import { useReveal } from "../lib/useReveal";

interface Props {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export function Section({ id, index, eyebrow, title, intro, children }: Props) {
  const headRef = useReveal<HTMLDivElement>();

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="container-page pt-24">
      <div ref={headRef}>
        <p data-reveal style={{ "--i": 0 } as React.CSSProperties} className="eyebrow">
          {index} — {eyebrow}
        </p>
        <h2
          id={`${id}-title`}
          data-reveal
          style={{ "--i": 1 } as React.CSSProperties}
          className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          {title}
        </h2>
        {intro && (
          <p data-reveal style={{ "--i": 2 } as React.CSSProperties} className="mt-3 max-w-2xl text-lg text-muted">
            {intro}
          </p>
        )}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
