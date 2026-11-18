import type { VoleiMember } from "./domain";
import type { ParticipationProfile } from "./students";

/** Only call for the owner of the device/token, never for public roster rows. */
export function ownParticipationProfile(member: Pick<VoleiMember, "birth_date" | "student_weekdays" | "requested_student_weekdays" | "student_class_time" | "requested_student_class_time" | "participation_reviewed_at">): ParticipationProfile {
  const requested = member.requested_student_weekdays != null;
  if (member.birth_date && member.participation_reviewed_at) return { birthDate: null, days: [], classTime: null, reviewed: true };
  return {
    birthDate: member.birth_date ?? null,
    days: (requested ? member.requested_student_weekdays : member.student_weekdays) ?? [],
    classTime: ((requested ? member.requested_student_class_time : member.student_class_time) ?? "").slice(0, 5) || null,
    reviewed: !!member.birth_date && !!member.participation_reviewed_at,
  };
}
