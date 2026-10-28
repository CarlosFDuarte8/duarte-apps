import { z } from "zod";
export const complaintStatuses = {
  open: "Nova",
  in_review: "Em análise",
  resolved: "Concluída",
} as const;
export type ComplaintStatus = keyof typeof complaintStatuses;
export const complaintSchema = z.object({
  targetType: z.enum(["member", "guest"]),
  targetId: z.uuid(),
  eventId: z.uuid().nullable(),
  title: z
    .string()
    .trim()
    .min(5, "Escreva um assunto com pelo menos 5 caracteres.")
    .max(120),
  description: z
    .string()
    .trim()
    .min(20, "Descreva o ocorrido com pelo menos 20 caracteres.")
    .max(3000),
  submissionKey: z.uuid(),
});
export function canSubmitComplaint(
  player: {
    is_core?: boolean;
    is_active: boolean;
    blocked: boolean;
    membership_status: string;
  } | null,
) {
  return (
    !!player?.is_core &&
    player.is_active &&
    !player.blocked &&
    player.membership_status === "approved"
  );
}
export type Complaint = {
  id: string;
  reporter_id: string | null;
  reporter_name: string;
  target_type: "member" | "guest";
  target_member_id: string | null;
  target_guest_id: string | null;
  target_name: string;
  sponsor_name: string | null;
  event_id: string | null;
  event_date: string | null;
  title: string;
  description: string;
  status: ComplaintStatus;
  read_at: string | null;
  admin_note: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};
export type NotificationSummary = {
  pendingMembers: number;
  openComplaints: number;
  unreadComplaints: number;
};
