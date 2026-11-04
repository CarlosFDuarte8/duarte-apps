import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { serviceClient } from "@/lib/escalas/supabase";
import { mobileAdmin, mobileHeaders } from "./mobile-auth";
const bucket = "volei-profiles";
const maxBytes = 1024 * 1024;
export async function mobilePhotoUpload(request: Request) {
  const headers = mobileHeaders(request);
  if (!headers)
    return Response.json({ error: "Origem não permitida." }, { status: 403 });
  const fail = (status: number, error: string) =>
    Response.json({ error }, { status, headers });
  if (!["POST", "DELETE"].includes(request.method))
    return fail(405, "Método inválido.");
  let uploaded: string | null = null;
  let committed = false;
  try {
    const auth = await mobileAdmin(request);
    if (!auth.client)
      return fail(auth.status, "Sessão administrativa obrigatória.");
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((key) => !["id", "kind"].includes(key)) ||
      params.getAll("id").length !== 1 ||
      params.getAll("kind").length !== 1
    )
      return fail(400, "Cadastro inválido.");
    const parsed = z
      .object({ id: z.uuid(), kind: z.enum(["member", "guest"]) })
      .safeParse(Object.fromEntries(params));
    if (!parsed.success) return fail(400, "Cadastro inválido.");
    const { id, kind } = parsed.data;
    const table = kind === "member" ? "volei_members" : "volei_guests";
    const row = await auth.client
      .from(table)
      .select("id,photo_path")
      .eq("id", id)
      .maybeSingle();
    if (row.error) return fail(503, "Não foi possível consultar o cadastro.");
    if (!row.data) return fail(404, "Cadastro não encontrado.");
    let newPath: string | null = null;
    if (request.method === "POST") {
      const mime = request.headers.get("content-type")?.split(";")[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime ?? ""))
        return fail(415, "Escolha uma foto JPG, PNG ou WebP.");
      if (Number(request.headers.get("content-length")) > maxBytes)
        return fail(413, "A foto deve ter até 1 MB.");
      const reader = request.body?.getReader();
      if (!reader) return fail(400, "Envie a foto.");
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > maxBytes) {
          await reader.cancel();
          return fail(413, "A foto deve ter até 1 MB.");
        }
        chunks.push(part.value);
      }
      if (!size) return fail(400, "Envie a foto.");
      let output: Buffer;
      try {
        const image = sharp(Buffer.concat(chunks), {
          limitInputPixels: 40000000,
          animated: false,
        });
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
          return fail(415, "Imagem inválida.");
        output = await image
          .rotate()
          .resize(512, 512, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        return fail(400, "Não foi possível ler a imagem.");
      }
      newPath = `${kind === "member" ? "members" : "guests"}/${id}/${randomUUID()}.webp`;
      const upload = await serviceClient()
        .storage.from(bucket)
        .upload(newPath, output, { contentType: "image/webp", upsert: false });
      if (upload.error) return fail(503, "Não foi possível enviar a foto.");
      uploaded = newPath;
    }
    let query = auth.client
      .from(table)
      .update({ photo_path: newPath })
      .eq("id", id);
    query =
      row.data.photo_path === null
        ? query.is("photo_path", null)
        : query.eq("photo_path", row.data.photo_path);
    const saved = await query.select("id").maybeSingle();
    if (saved.error || !saved.data)
      return fail(
        saved.error ? 503 : 409,
        "A foto mudou ou não foi possível salvar. Atualize o perfil antes de tentar novamente.",
      );
    committed = true;
    // Storage cleanup is best effort after commit; never report a saved photo as failed.
    if (row.data.photo_path) {
      try {
        await serviceClient()
          .storage.from(bucket)
          .remove([row.data.photo_path]);
      } catch {
        /* A scheduled storage audit can remove orphan files. */
      }
    }
    return Response.json({ ok: true }, { headers });
  } catch {
    return fail(503, "Fotos temporariamente indisponíveis.");
  } finally {
    if (uploaded && !committed) {
      try {
        await serviceClient().storage.from(bucket).remove([uploaded]);
      } catch {
        /* Keep database unchanged if cleanup fails. */
      }
    }
  }
}
