"use client";
import { useEffect, useState } from "react";

export function NetworkStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return online ? null : <div className="volley-network-status" role="status">Você está sem conexão. Os dados digitados continuam nesta tela. Reconecte-se antes de salvar.</div>;
}
