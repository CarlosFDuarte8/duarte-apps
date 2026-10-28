"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireVoleiAdmin as requireAdmin } from "@/lib/volei/auth";
import { phoneSchema } from "@/lib/volei/phone";
import { deleteStoredPhotos } from "@/lib/volei/photos";
import { preferencesSchema } from "@/lib/volei/frequency";
import {
  eventSchema,
  memberNameSchema,
  reasonSchema,
  type AttendanceStatus,
} from "@/lib/volei/domain";

type Result = { error: string };
const ok: Result = { error: "" };
const id = z.uuid();

function done(error: { message: string; code?: string } | null): Result {
  if (!error) {
    revalidatePath("/admin/volei", "layout");
    revalidatePath("/volei", "layout");
    return ok;
  }
  if (error.code === "23505") return { error: "Já existe um registro igual." };
  return { error: "Não foi possível salvar. Tente novamente." };
}

function invalid(error: z.ZodError): Result {
  return { error: error.issues[0]?.message ?? "Dados inválidos." };
}

export async function createEvents(input: unknown): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { dates, registration_time, ...rest } = parsed.data;
  const { error } = await client.from("volei_events").upsert(
    [...new Set(dates)].map((date) => ({
      date,
      ...rest,
      registration_deadline: new Date(
        `${date}T${registration_time}:00-03:00`,
      ).toISOString(),
    })),
    { onConflict: "date", ignoreDuplicates: true },
  );
  return done(error);
}

export async function updateEvent(
  eventId: string,
  input: unknown,
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(100),
      start_time: z.string().trim().max(20),
      location: z.string().trim().max(120),
      notes: z.string().trim().max(500),
      closed: z.boolean(),
      registration_deadline: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .optional(),
      guests_open_at: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .optional(),
    })
    .safeParse(input);
  if (!parsed.success || !id.safeParse(eventId).success)
    return { error: "Dados inválidos." };
  const { error } = await client
    .from("volei_events")
    .update(parsed.data)
    .eq("id", eventId);
  return done(error);
}

export async function deleteEvent(eventId: string): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(eventId).success) return { error: "Dados inválidos." };
  const { error } = await client
    .from("volei_events")
    .delete()
    .eq("id", eventId);
  return done(error);
}

export async function setAttendance(
  eventId: string,
  memberId: string,
  status: AttendanceStatus | "limpar",
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      eventId: id,
      memberId: id,
      status: z.enum(["confirmado", "nao_vai", "limpar", "ausente"]),
    })
    .safeParse({ eventId, memberId, status });
  if (!parsed.success) return { error: "Dados inválidos." };
  const { error } = await client.rpc("volei_respond", {
    p_event: eventId,
    p_member: memberId,
    p_status: status,
  });
  return done(error);
}

export async function addMember(name: string, phone = ""): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = memberNameSchema.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const contact = phone ? phoneSchema.safeParse(phone) : null;
  if (contact && !contact.success) return invalid(contact.error);
  const { error } = await client.from("volei_members").insert({
    name: parsed.data,
    phone: contact?.data ?? null,
    membership_status: "approved",
  });
  return done(error);
}

export async function saveMemberContact(
  memberId: string,
  input: unknown,
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      name: memberNameSchema,
      phone: z.union([z.literal(""), phoneSchema]),
    })
    .safeParse(input);
  if (!id.safeParse(memberId).success || !parsed.success)
    return { error: "Confira o nome e o celular com DDD." };
  const { data, error: readError } = await client
    .from("volei_members")
    .select("phone")
    .eq("id", memberId)
    .single();
  if (readError) return done(readError);
  const phone = parsed.data.phone || null;
  const { error } = await client
    .from("volei_members")
    .update({
      name: parsed.data.name,
      phone,
      ...(data.phone !== phone ? { device_secret_hash: null } : {}),
    })
    .eq("id", memberId);
  return done(error);
}

export async function resetMemberDevice(memberId: string): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(memberId).success) return { error: "Membro inválido." };
  const { error } = await client
    .from("volei_members")
    .update({ device_secret_hash: null })
    .eq("id", memberId);
  return done(error);
}

export async function importMembers(
  input: unknown,
): Promise<Result & { imported: number }> {
  const { client } = await requireAdmin();
  const parsed = z.array(memberNameSchema).max(100).safeParse(input);
  if (!parsed.success) return { ...invalid(parsed.error), imported: 0 };

  const { data: existing, error: listError } = await client
    .from("volei_members")
    .select("name");
  if (listError)
    return { error: "Não foi possível ler os membros atuais.", imported: 0 };

  const normalize = (name: string) =>
    name.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
  const known = new Set(
    (existing ?? []).map((member) => normalize(member.name)),
  );
  const missing = [...new Set(parsed.data.map((name) => name.trim()))].filter(
    (name) => {
      const key = normalize(name);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    },
  );

  if (missing.length === 0) return { error: "", imported: 0 };
  const { error } = await client
    .from("volei_members")
    .insert(missing.map((name) => ({ name, membership_status: "approved" })));
  if (error)
    return { error: "Não foi possível importar os membros.", imported: 0 };
  revalidatePath("/admin/volei", "layout");
  return { error: "", imported: missing.length };
}

export async function updateMember(
  memberId: string,
  input: unknown,
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({ name: memberNameSchema, is_active: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!id.safeParse(memberId).success) return { error: "Dados inválidos." };
  const { error } = await client
    .from("volei_members")
    .update(parsed.data)
    .eq("id", memberId);
  return done(error);
}

export async function setBlocked(
  memberId: string,
  blocked: boolean,
  reason: string,
): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(memberId).success) return { error: "Dados inválidos." };
  let text = "";
  if (blocked) {
    const parsed = reasonSchema.safeParse(reason);
    if (!parsed.success) return invalid(parsed.error);
    text = parsed.data;
  }
  const { error } = await client
    .from("volei_members")
    .update({ blocked, blocked_reason: text })
    .eq("id", memberId);
  return done(error);
}

export async function adjustPoints(
  memberId: string,
  delta: number,
  reason: string,
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      memberId: id,
      delta: z
        .number()
        .int()
        .min(-100)
        .max(100)
        .refine((n) => n !== 0, "Informe a quantidade de pontos."),
      reason: reasonSchema,
    })
    .safeParse({ memberId, delta, reason });
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await client.rpc("volei_adjust_points", {
    p_member: memberId,
    p_delta: parsed.data.delta,
    p_reason: parsed.data.reason,
  });
  return done(error);
}

export async function deleteMember(memberId: string): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(memberId).success) return { error: "Dados inválidos." };
  const [member, guests] = await Promise.all([
    client
      .from("volei_members")
      .select("photo_path")
      .eq("id", memberId)
      .maybeSingle(),
    client.from("volei_guests").select("photo_path").eq("member_id", memberId),
  ]);
  if (member.error || guests.error) return done(member.error || guests.error);
  const { error } = await client
    .from("volei_members")
    .delete()
    .eq("id", memberId);
  if (!error)
    await deleteStoredPhotos([
      member.data?.photo_path,
      ...(guests.data ?? []).map((guest) => guest.photo_path),
    ]);
  return done(error);
}

export async function regenerateToken(memberId: string): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(memberId).success) return { error: "Dados inválidos." };
  const token = (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
  const { error } = await client
    .from("volei_members")
    .update({ token })
    .eq("id", memberId);
  return done(error);
}

export async function saveMemberPreferences(
  memberId: string,
  input: unknown,
): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = preferencesSchema.safeParse(input);
  if (!id.safeParse(memberId).success) return { error: "Membro inválido." };
  if (!parsed.success) return invalid(parsed.error);
  const { error } = await client
    .from("volei_members")
    .update(parsed.data)
    .eq("id", memberId);
  return done(error);
}
export async function recordPresence(input: unknown): Promise<Result> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      eventId: id,
      memberId: id,
      present: z.boolean(),
      guest: z.boolean().default(false),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Dados de presença inválidos." };
  const p = parsed.data;
  const { error } = await client.rpc("volei_record_presence", {
    p_event: p.eventId,
    p_member: p.memberId,
    p_present: p.present,
    p_guest: p.guest,
  });
  if (error?.code === "P0001") return { error: error.message };
  return done(error);
}
export async function closePresence(eventId: string): Promise<Result> {
  const { client } = await requireAdmin();
  if (!id.safeParse(eventId).success) return { error: "Jogo inválido." };
  const { error } = await client.rpc("volei_close_presence", {
    p_event: eventId,
  });
  if (error?.code === "P0001") return { error: error.message };
  return done(error);
}

export async function reviewMembership(
  memberId: string,
  decision: "approved" | "rejected",
): Promise<Result> {
  const { client } = await requireAdmin();
  if (
    !id.safeParse(memberId).success ||
    !["approved", "rejected"].includes(decision)
  )
    return { error: "Dados inválidos." };
  const { error } = await client
    .from("volei_members")
    .update({ membership_status: decision, is_active: decision === "approved" })
    .eq("id", memberId)
    .in("membership_status", ["pending", "rejected"]);
  return done(error);
}
