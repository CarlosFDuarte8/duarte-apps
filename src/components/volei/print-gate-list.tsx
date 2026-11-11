"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PrintGateList() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer aria-hidden="true" /> Imprimir lista da portaria
    </Button>
  );
}
