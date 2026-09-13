"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: content stays readable without JavaScript. */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (!preference.matches) {
        animation = element.animate(
          [
            { opacity: 0, transform: "translateY(24px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
        );
      }
      observer.disconnect();
    }, { threshold: 0.08 });

    const onPreferenceChange = () => {
      if (preference.matches) animation?.cancel();
    };

    observer.observe(element);
    preference.addEventListener("change", onPreferenceChange);
    return () => {
      observer.disconnect();
      animation?.cancel();
      preference.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
