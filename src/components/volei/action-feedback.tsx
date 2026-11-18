"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function ActionFeedback({ error, recovery, pending, onRefresh }: {
  error: string; recovery: "none" | "not-sent" | "uncertain"; pending: boolean; onRefresh: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inForm, setInForm] = useState(false);
  useEffect(() => { setInForm(!!ref.current?.closest("form")); }, [error]);
  if (!error) return null;
  const resubmit = recovery === "not-sent" && inForm;
  return <div ref={ref} className="volley-action-feedback" role="alert">
    <p>{error}</p>
    {recovery !== "none" && <Button type="button" variant="outline" disabled={pending} onClick={() => {
      // Resubmit the current form, including edits and native validation.
      // An uncertain write is only verified; it is never replayed here.
      if (resubmit) ref.current?.closest("form")?.requestSubmit();
      else onRefresh();
    }}>{resubmit ? "Tentar novamente" : "Atualizar situação"}</Button>}
  </div>;
}
