"use client";
import { useState } from "react";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { saveSkillLevel } from "@/app/admin/volei-profile-actions";
import { skillLabels } from "@/lib/volei/profile";
import { useRun } from "./use-run";
export function SkillLevelForm({
  id,
  guest = false,
  level,
}: {
  id: string;
  guest?: boolean;
  level?: number | null;
}) {
  const [value, setValue] = useState(String(level ?? 0));
  const [saved, setSaved] = useState(false);
  const { run, pending, feedback } = useRun();
  return (
    <form
      className="vl-box"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        run(
          () => saveSkillLevel(id, guest, Number(value) || null),
          () => setSaved(true),
        );
      }}
    >
      <h2 className="vm-editor-heading">Nível para equilibrar os times</h2>
      <p className="vm-hint">
        Avaliação privada, ajustada pelo responsável conforme conhece a pessoa.
        Sem avaliação usa peso intermediário no sorteio.
      </p>
      <label>
        Nível
        <NativeSelect
          value={value}
          disabled={pending}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
        >
          {skillLabels.map((label, index) => (
            <option key={label} value={index}>
              {index ? `${index} · ` : ""}
              {label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Button variant="outline" disabled={pending}>
        Salvar nível
      </Button>
      {saved && (
        <p role="status" className="vm-success">
          Nível atualizado.
        </p>
      )}
      {feedback}
    </form>
  );
}
