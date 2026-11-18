"use client";

import Image from "next/image";
import logo from "@/assets/logos/Logo- Privaty-Volleyball.png";
import styles from "./logo.module.css";

export function VolleyLogo({ print = false }: { print?: boolean }) {
  return <Image
    src={logo}
    alt={print ? "Privaty Volleyball" : ""}
    data-slot={print ? "volley-print-logo" : "volley-logo"}
    className={print ? styles.printLogo : undefined}
    sizes={print ? "80px" : "56px"}
    loading="eager"
    unoptimized={print}
  />;
}
