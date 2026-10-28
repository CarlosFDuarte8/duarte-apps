import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/escalas/supabase";
import { birthDateSchema, emergencyContactSchema } from "./profile";

const bucket = "volei-profiles";
export async function deleteStoredPhotos(paths: (string | null | undefined)[]) {
  const files = paths.filter((path): path is string => !!path);
  if (files.length) await serviceClient().storage.from(bucket).remove(files);
}
export async function signPhotos<T extends { photo_path?: string | null }>(
  rows: T[],
): Promise<(T & { photo_url: string | null })[]> {
  const paths = [
    ...new Set(rows.flatMap((row) => (row.photo_path ? [row.photo_path] : []))),
  ];
  if (!paths.length) return rows.map((row) => ({ ...row, photo_url: null }));
  const { data, error } = await serviceClient()
    .storage.from(bucket)
    .createSignedUrls(paths, 3600);
  if (error) throw new Error("Não foi possível carregar as fotos.");
  const urls = new Map(data?.map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({
    ...row,
    photo_url: urls.get(row.photo_path ?? "") || null,
  }));
}

export async function saveProfilePhoto(
  client: SupabaseClient,
  table: "volei_members" | "volei_guests",
  person: { id: string; photo_path?: string | null },
  form: FormData,
  credential?: {
    column: "device_secret_hash" | "profile_token";
    value: string;
  },
) {
  const birth = birthDateSchema.safeParse(form.get("birth_date") ?? "");
  if (!birth.success) return { error: birth.error.issues[0].message };
  const contact = form.has("emergency_name")
    ? emergencyContactSchema.safeParse({
        emergency_name: form.get("emergency_name"),
        emergency_phone: form.get("emergency_phone"),
        emergency_relationship: form.get("emergency_relationship"),
      })
    : null;
  if (contact && !contact.success)
    return { error: contact.error.issues[0].message };
  const file = form.get("photo");
  let photoPath = person.photo_path ?? null;
  let uploaded: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (
      file.size > 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return { error: "Escolha uma foto JPG, PNG ou WebP de até 1 MB." };
    let image: Buffer;
    try {
      const input = sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40000000,
        animated: false,
      });
      const metadata = await input.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
        return { error: "O arquivo não é uma foto válida." };
      image = await input
        .rotate()
        .resize(512, 512, { fit: "cover" })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return { error: "Não foi possível ler esta foto. Escolha outra imagem." };
    }
    photoPath = `${table === "volei_members" ? "members" : "guests"}/${person.id}/${randomUUID()}.webp`;
    const { error } = await serviceClient()
      .storage.from(bucket)
      .upload(photoPath, image, { contentType: "image/webp", upsert: false });
    if (error)
      return { error: "Não foi possível enviar a foto. Tente novamente." };
    uploaded = photoPath;
  } else if (form.get("remove_photo") === "true") photoPath = null;
  let query = client
    .from(table)
    .update({
      birth_date: birth.data,
      photo_path: photoPath,
      ...(contact?.success ? contact.data : {}),
    })
    .eq("id", person.id);
  if (credential) query = query.eq(credential.column, credential.value);
  const { data, error } = await query.select("id").maybeSingle();
  if (error || !data) {
    if (uploaded) await serviceClient().storage.from(bucket).remove([uploaded]);
    return {
      error:
        "Não foi possível salvar o cadastro. Verifique seu acesso e tente novamente.",
    };
  }
  if (person.photo_path && person.photo_path !== photoPath)
    await serviceClient().storage.from(bucket).remove([person.photo_path]);
  return { error: "" };
}
