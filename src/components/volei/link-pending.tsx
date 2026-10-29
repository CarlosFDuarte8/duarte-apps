"use client";
import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      className="volley-nav-pending"
      role="status"
      aria-label="Abrindo página"
    >
      <LoaderCircle className="volley-spin" aria-hidden="true" />
    </span>
  ) : null;
}
