"use client";
import { Button } from "@/components/ui/button";
export function PrintGateList() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir lista da portaria
    </Button>
  );
}
