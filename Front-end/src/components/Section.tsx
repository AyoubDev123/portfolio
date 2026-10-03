import { useGSAP } from "@gsap/react";
import { useRef, type ReactNode } from "react";
import { gsap } from "../lib/gsap";

interface Props {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
}

export function Section({ id, index, eyebrow, title, intro, children }: Props) {
  const headRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = headRef.current;
      if (!el) return;
      const targets = el.querySelectorAll<HTMLElement>(".s-reveal");
      if (!targets.length) return;
      gsap.from(targets, {
        y: 22,
        opacity: 0,
        duration: 0.65,
        ease: "power2.out",
        stagger: 0.07,
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: headRef },
  );

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="container-page pt-24">
      <div ref={headRef}>
        <p className="s-reveal eyebrow">
          {index} — {eyebrow}
        </p>
        <h2 id={`${id}-title`} className="s-reveal mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {intro && <p className="s-reveal mt-3 max-w-2xl text-lg text-muted">{intro}</p>}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}
