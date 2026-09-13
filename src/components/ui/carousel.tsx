"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowIcon } from "./icons";
import "./carousel.css";

type Slide = { id: string; label: string; content: ReactNode };

function subscribeToMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function subscribeToVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

export function Carousel({
  slides,
  label,
  interval = 6000,
}: {
  slides: Slide[];
  label: string;
  interval?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const rotationEnabled = !paused && !focusPaused && !reducedMotion;
  const playing = rotationEnabled && !hovered && visible && pageVisible && slides.length > 1;

  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: 0.25 });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % slides.length);
    }, interval);
    return () => window.clearTimeout(timer);
  }, [active, interval, playing, slides.length]);

  function goTo(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }

  if (!slides.length) return null;

  return (
    <div
      ref={container}
      className="carousel"
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest(".carousel-rotation")) return;
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(active + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className="carousel-toolbar">
        <span className="carousel-count"><strong>{String(active + 1).padStart(2, "0")}</strong> / {String(slides.length).padStart(2, "0")}</span>
        {slides.length > 1 && !reducedMotion && (
          <button
            type="button"
            className="carousel-rotation"
            onClick={() => {
              if (rotationEnabled && !hovered) setPaused(true);
              else { setPaused(false); setFocusPaused(false); setHovered(false); }
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              {rotationEnabled && !hovered ? <path d="M7 5v10M13 5v10" /> : <path d="m7 4 8 6-8 6Z" />}
            </svg>
            {rotationEnabled && !hovered ? "Pausar apresentação" : "Reproduzir automaticamente"}
          </button>
        )}
      </div>
      <div
        className="carousel-viewport"
        tabIndex={slides.length > 1 ? 0 : undefined}
        aria-label="Projetos; use as setas do teclado ou deslize para navegar"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          setPaused(true);
          if (event.target instanceof Element && event.target.closest("a, button")) return;
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            goTo(active + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => { gesture.current = null; }}
        onLostPointerCapture={() => { gesture.current = null; }}
      >
        <div className="carousel-track" style={{ transform: `translate3d(-${active * 100}%, 0, 0)` }}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} de ${slides.length}: ${slide.label}`}
            inert={index !== active}
          >
            {slide.content}
          </div>
        ))}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="carousel-controls">
          <button type="button" className="carousel-arrow carousel-previous" aria-label="Projeto anterior" onClick={() => goTo(active - 1)}><ArrowIcon /></button>
          <div className="carousel-dots" role="group" aria-label="Escolher projeto">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ver projeto ${index + 1}: ${slide.label}`}
                aria-current={active === index ? "true" : undefined}
                onClick={() => goTo(index)}
              ><span /></button>
            ))}
          </div>
          <button type="button" className="carousel-arrow" aria-label="Próximo projeto" onClick={() => goTo(active + 1)}><ArrowIcon /></button>
        </div>
      )}
      <span className="carousel-status" aria-live={rotationEnabled ? "off" : "polite"} aria-atomic="true">
        Projeto {active + 1} de {slides.length}: {slides[active]?.label}
      </span>
    </div>
  );
}
