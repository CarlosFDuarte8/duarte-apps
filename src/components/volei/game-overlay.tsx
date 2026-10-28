"use client";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
export function GameOverlay({
  children,
  onExit,
}: {
  children: ReactNode;
  onExit: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onExit();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="vc-game-backdrop" />
        <Dialog.Content className="volley-app vc-game-overlay">
          <Dialog.Title className="sr-only">Modo jogo</Dialog.Title>
          <Dialog.Description className="sr-only">
            Placar, cronômetro e organização dos times na quadra.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
