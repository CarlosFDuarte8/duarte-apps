"use client";
import { useState } from "react";
import Image from "next/image";
import "./profile.css";
export function PersonAvatar({
  name,
  photoUrl,
  large = false,
}: {
  name: string;
  photoUrl?: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState("");
  return (
    <span className={`vp-avatar${large ? " vp-avatar-large" : ""}`}>
      {photoUrl && failed !== photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Foto de ${name}`}
          width={large ? 112 : 40}
          height={large ? 112 : 40}
          unoptimized
          onError={() => setFailed(photoUrl)}
        />
      ) : (
        <span aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
      )}
    </span>
  );
}
