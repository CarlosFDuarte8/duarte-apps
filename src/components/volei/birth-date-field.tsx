"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { today } from "@/lib/volei/domain";

export function BirthDateField({
  value,
  onChange,
  disabled = false,
  required = true,
  maxDate = today(),
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  maxDate?: string;
}) {
  const id = useId();
  return (
    <div className="vp-birth-label">
      <label htmlFor={id}>
        Data de nascimento{!required && " (opcional)"}
        <Input
          id={id}
          name="birth_date"
          type="date"
          autoComplete="bday"
          min="1900-01-01"
          max={maxDate}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={`${id}-privacy`}
        />
      </label>
      <small id={`${id}-privacy`}>
        Informação privada para os administradores. Não aparece na lista pública.
      </small>
    </div>
  );
}
