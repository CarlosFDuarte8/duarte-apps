"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./photo-cropper.css";

const size = 512;
type View = { x: number; y: number; zoom: number };
type Point = { x: number; y: number };

export function PhotoCropper({
  image,
  onApply,
  onCancel,
}: {
  image: ImageBitmap;
  onApply: (photo: File) => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

  function bound(next: View): View {
    const zoom = Math.min(4, Math.max(1, next.zoom));
    const scale = (size / Math.min(image.width, image.height)) * zoom;
    const maxX = (image.width * scale - size) / 2;
    const maxY = (image.height * scale - size) / 2;
    return {
      zoom,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }
  function zoomTo(zoom: number) {
    setView((current) =>
      bound({
        zoom,
        x: (current.x * zoom) / current.zoom,
        y: (current.y * zoom) / current.zoom,
      }),
    );
  }

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const scale = (size / Math.min(image.width, image.height)) * view.zoom;
    context.clearRect(0, 0, size, size);
    context.drawImage(
      image,
      (size - image.width * scale) / 2 + view.x,
      (size - image.height * scale) / 2 + view.y,
      image.width * scale,
      image.height * scale,
    );
  }, [image, view]);

  return (
    <dialog
      ref={dialog}
      className="vp-crop-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id={`${id}-title`}>Ajustar foto</h2>
      <p id={`${id}-description`}>
        Arraste a foto para enquadrar o rosto. Use o zoom ou faça o gesto de
        pinça com dois dedos.
      </p>
      <div className="vp-crop-viewport">
        <canvas
          ref={canvas}
          width={size}
          height={size}
          tabIndex={0}
          role="img"
          aria-label="Prévia do avatar. Use as setas do teclado para mover a foto."
          onKeyDown={(event) => {
            const move: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            const direction = move[event.key];
            if (!direction || busy) return;
            event.preventDefault();
            const step = event.shiftKey ? 40 : 12;
            setView((current) =>
              bound({
                ...current,
                x: current.x + direction[0] * step,
                y: current.y + direction[1] * step,
              }),
            );
          }}
          onPointerDown={(event) => {
            if (busy || (event.pointerType === "mouse" && event.button !== 0))
              return;
            event.currentTarget.setPointerCapture(event.pointerId);
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
          }}
          onPointerMove={(event) => {
            if (busy || !pointers.current.has(event.pointerId)) return;
            const before = [...pointers.current.values()];
            pointers.current.set(event.pointerId, {
              x: event.clientX,
              y: event.clientY,
            });
            const after = [...pointers.current.values()];
            const ratio =
              size / event.currentTarget.getBoundingClientRect().width;
            if (before.length === 1) {
              setView((current) =>
                bound({
                  ...current,
                  x: current.x + (after[0].x - before[0].x) * ratio,
                  y: current.y + (after[0].y - before[0].y) * ratio,
                }),
              );
            } else if (before.length === 2) {
              const distance = (points: Point[]) =>
                Math.hypot(
                  points[0].x - points[1].x,
                  points[0].y - points[1].y,
                );
              const oldDistance = distance(before);
              if (oldDistance < 1) return;
              const factor = distance(after) / oldDistance;
              setView((current) => {
                const zoom = Math.min(4, Math.max(1, current.zoom * factor));
                return bound({
                  zoom,
                  x:
                    (current.x * zoom) / current.zoom +
                    ((after[0].x + after[1].x - before[0].x - before[1].x) /
                      2) *
                      ratio,
                  y:
                    (current.y * zoom) / current.zoom +
                    ((after[0].y + after[1].y - before[0].y - before[1].y) /
                      2) *
                      ratio,
                });
              });
            }
          }}
          onPointerUp={(event) => pointers.current.delete(event.pointerId)}
          onPointerCancel={(event) => pointers.current.delete(event.pointerId)}
          onLostPointerCapture={(event) =>
            pointers.current.delete(event.pointerId)
          }
        />
        <span className="vp-crop-circle" aria-hidden="true" />
      </div>
      <div className="vp-crop-zoom">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Diminuir zoom"
          disabled={busy || view.zoom <= 1}
          onClick={() => zoomTo(Math.max(1, view.zoom - 0.1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <label className="vp-crop-slider">
          Zoom · {Math.round(view.zoom * 100)}%
          <input
            type="range"
            aria-label="Zoom da foto"
            min={1}
            max={4}
            step={0.01}
            value={view.zoom}
            disabled={busy}
            aria-valuetext={`${Math.round(view.zoom * 100)}%`}
            onChange={(event) => zoomTo(Number(event.target.value))}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Aumentar zoom"
          disabled={busy || view.zoom >= 4}
          onClick={() => zoomTo(Math.min(4, view.zoom + 0.1))}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={busy}
        onClick={() => setView({ x: 0, y: 0, zoom: 1 })}
      >
        <RotateCcw aria-hidden="true" />
        Centralizar foto
      </Button>
      {error && <p role="alert">{error}</p>}
      <div className="vp-crop-actions">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const blob = await new Promise<Blob>((resolve, reject) =>
                canvas.current?.toBlob(
                  (value) => (value ? resolve(value) : reject(Error())),
                  "image/webp",
                  0.85,
                ),
              );
              onApply(new File([blob], "profile.webp", { type: "image/webp" }));
            } catch {
              setError("Não foi possível recortar a foto. Tente novamente.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparando…" : "Usar esta foto"}
        </Button>
      </div>
    </dialog>
  );
}
