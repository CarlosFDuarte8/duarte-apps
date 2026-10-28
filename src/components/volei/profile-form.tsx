"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "./person-avatar";
import { PhotoCropper } from "./photo-cropper";
import { PhoneInput } from "./phone-input";
import "./profile.css";

export function ProfileForm({
  name,
  birthDate,
  photoUrl,
  maxDate,
  save,
  emergency,
}: {
  name: string;
  birthDate?: string | null;
  photoUrl?: string | null;
  maxDate: string;
  save: (form: FormData) => Promise<{ error: string }>;
  emergency?: {
    emergency_name?: string;
    emergency_phone?: string;
    emergency_relationship?: string;
  };
}) {
  const [birth, setBirth] = useState(birthDate ?? "");
  const [contactName, setContactName] = useState(
    emergency?.emergency_name ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    emergency?.emergency_phone ?? "",
  );
  const [contactRelationship, setContactRelationship] = useState(
    emergency?.emergency_relationship ?? "",
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [remove, setRemove] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cropImage, setCropImage] = useState<ImageBitmap | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => () => cropImage?.close(), [cropImage]);
  return (
    <>
      <form
        className="vp-profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage("");
          const form = new FormData();
          form.set("birth_date", birth);
          form.set("emergency_name", contactName);
          form.set("emergency_phone", contactPhone);
          form.set("emergency_relationship", contactRelationship);
          form.set("remove_photo", String(remove));
          if (photo) form.set("photo", photo);
          start(async () => {
            try {
              const result = await save(form);
              setFailed(!!result.error);
              setMessage(result.error || "Cadastro atualizado.");
              if (!result.error) router.refresh();
            } catch {
              setFailed(true);
              setMessage("Não foi possível salvar. Tente novamente.");
            }
          });
        }}
      >
        <div className="vp-photo-editor">
          <PersonAvatar
            name={name}
            photoUrl={remove ? null : preview || photoUrl}
            large
          />
          <div>
            <h3>Foto de identificação</h3>
            <p>Opcional. Escolha uma foto em que seu rosto esteja visível.</p>
            <label className="vp-photo-picker">
              {processing ? "Preparando foto…" : "Escolher foto"}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending || processing}
                aria-label="Escolher foto de identificação"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (
                    file.size > 10 * 1024 * 1024 ||
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    )
                  ) {
                    setFailed(true);
                    setMessage(
                      "Escolha uma foto JPG, PNG ou WebP de até 10 MB.",
                    );
                    return;
                  }
                  setProcessing(true);
                  setMessage("");
                  try {
                    const image = await createImageBitmap(file);
                    if (image.width * image.height > 40000000) {
                      image.close();
                      throw Error();
                    }
                    setCropImage(image);
                  } catch {
                    setFailed(true);
                    setMessage(
                      "Não foi possível abrir a foto. Tente outra imagem.",
                    );
                  } finally {
                    setProcessing(false);
                  }
                }}
              />
            </label>
            {(photoUrl || photo) && !remove && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending || processing}
                onClick={() => {
                  setRemove(true);
                  setPhoto(null);
                  setPreview("");
                }}
              >
                Remover foto
              </Button>
            )}
            <small>
              JPG, PNG ou WebP · até 10 MB. A imagem é reduzida automaticamente.
            </small>
          </div>
        </div>
        <label className="vp-birth-label">
          Data de nascimento
          <Input
            type="date"
            min="1900-01-01"
            max={maxDate}
            value={birth}
            onChange={(e) => setBirth(e.target.value)}
          />
          <small>
            Ajuda o responsável a identificar participantes menores de 18 anos.
          </small>
        </label>
        <fieldset className="vp-emergency">
          <legend>Contato de emergência (opcional)</legend>
          <p>
            Uma pessoa para o responsável contatar se precisar. Para menores,
            pode ser o pai, a mãe ou outro responsável.
          </p>
          <label>
            Nome do contato
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              maxLength={100}
            />
          </label>
          <label>
            Telefone do contato
            <PhoneInput value={contactPhone} onChange={setContactPhone} />
          </label>
          <label>
            Vínculo com você
            <Input
              value={contactRelationship}
              onChange={(e) => setContactRelationship(e.target.value)}
              maxLength={60}
              placeholder="Ex.: mãe, pai, cônjuge"
            />
          </label>
        </fieldset>
        <p className="vp-private-note">
          Foto e nascimento ficam disponíveis apenas neste cadastro e no painel
          administrativo. O contato de emergência também é privado.
        </p>
        <Button type="submit" disabled={pending || processing || !!cropImage}>
          {pending ? "Salvando…" : "Salvar dados do cadastro"}
        </Button>
        {message && (
          <p
            className={failed ? "volley-error" : "vm-success"}
            role={failed ? "alert" : "status"}
          >
            {message}
          </p>
        )}
      </form>
      {cropImage && (
        <PhotoCropper
          image={cropImage}
          onCancel={() => setCropImage(null)}
          onApply={(file) => {
            setPhoto(file);
            setPreview(URL.createObjectURL(file));
            setRemove(false);
            setCropImage(null);
          }}
        />
      )}
    </>
  );
}
