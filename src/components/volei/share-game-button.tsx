"use client";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "./use-run";
export function ShareGameButton({ id }: { id: string }) {
  const { copy, copied } = useCopy();
  return (
    <Button
      variant="outline"
      className="vx-share"
      onClick={() => copy(`${window.location.origin}/volei/jogo/${id}`)}
    >
      {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      {copied ? "Link copiado" : "Copiar link"}
    </Button>
  );
}
