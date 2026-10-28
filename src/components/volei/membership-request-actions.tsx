"use client";
import { Button } from "@/components/ui/button";
import { reviewMembership } from "@/app/admin/volei-actions";
import { useRun } from "./use-run";
export function MembershipRequestActions({ id }: { id: string }) {
  const { run, pending, feedback } = useRun();
  return (
    <div className="vn-membership-actions">
      <Button
        disabled={pending}
        onClick={() => run(() => reviewMembership(id, "approved"))}
      >
        Aprovar cadastro
      </Button>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => run(() => reviewMembership(id, "rejected"))}
      >
        Recusar cadastro
      </Button>
      {feedback}
    </div>
  );
}
