"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { VoleiEvent } from "@/lib/volei/domain";

export function EventLinkSettings({ event, pending }: { event: VoleiEvent; pending: boolean }) {
  const [directionsEnabled, setDirectionsEnabled] = useState(event.directions_enabled === true);
  return <fieldset className="volley-field-group" disabled={pending}>
    <legend>Calendário e localização na área pública</legend>
    <label className="sc-check"><input type="checkbox" name="calendar_enabled" defaultChecked={event.calendar_enabled === true} />Exibir botão Salvar no calendário</label>
    <label className="sc-check"><input type="checkbox" name="directions_enabled" checked={directionsEnabled} onChange={event => setDirectionsEnabled(event.target.checked)} />Exibir botão Abrir rota</label>
    <label>Link do local<Input name="directions_url" type="url" maxLength={2048} defaultValue={event.directions_url ?? ""} placeholder="https://maps.app.goo.gl/..." required={directionsEnabled} /></label>
    <p className="volley-muted">Os botões só aparecem quando você ativa e salva estas opções. Para a rota, informe o link do local, como Google Maps ou Waze.</p>
  </fieldset>;
}
