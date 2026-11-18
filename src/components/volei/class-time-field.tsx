"use client";
import { NativeSelect } from "@/components/ui/native-select";
import { useId } from "react";

export function ClassTimeField({ value, onChange, excludeEveningClass = false }: {
  value: string; onChange: (value: string) => void; excludeEveningClass?: boolean;
}) {
  const [hour = "", minute = ""] = value.split(":");
  const id = useId();
  const pad = (number: number) => String(number).padStart(2, "0");
  return <fieldset className="volley-class-time">
    <legend>Horário de início da aula</legend>
    <div>
      <div className="volley-filter-field"><label htmlFor={`${id}-hour`}>Hora</label>
        <NativeSelect id={`${id}-hour`} required aria-label="Hora de início da aula" value={excludeEveningClass && hour === "18" ? "" : hour} onChange={event => onChange(`${event.target.value}:${minute}`)}>
          <option value="" disabled>Hora</option>
          {Array.from({ length: 24 }, (_, index) => index).filter(index => !excludeEveningClass || index !== 18).map(index => <option key={index} value={pad(index)}>{pad(index)}</option>)}
        </NativeSelect>
      </div>
      <div className="volley-filter-field"><label htmlFor={`${id}-minute`}>Minutos</label>
        <NativeSelect id={`${id}-minute`} required aria-label="Minutos de início da aula" value={minute} onChange={event => onChange(`${hour}:${event.target.value}`)}>
          <option value="" disabled>Minutos</option>
          {Array.from({ length: 60 }, (_, index) => <option key={index} value={pad(index)}>{pad(index)}</option>)}
        </NativeSelect>
      </div>
    </div>
  </fieldset>;
}
