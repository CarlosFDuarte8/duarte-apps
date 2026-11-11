"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
const api = "/api/admin/volei/web-push";
function supported() {
  return (
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}
async function command(data: object) {
  const response = await fetch(api, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Falha ao configurar avisos.");
  return result;
}
function applicationKey(key: string) {
  const value = atob(
    key.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (key.length % 4)) % 4),
  );
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}
async function worker() {
  const registration = await navigator.serviceWorker.register(
    "/volei-push-sw.js",
    { scope: "/admin/volei/", updateViaCache: "none" },
  );
  if (registration.active) return registration;
  const installing = registration.installing || registration.waiting;
  if (!installing) throw Error("Não foi possível iniciar os avisos.");
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      installing.removeEventListener("statechange", change);
      reject(
        Error("O navegador demorou para iniciar os avisos. Tente novamente."),
      );
    }, 15000);
    function change() {
      if (
        installing!.state === "activated" ||
        installing!.state === "redundant"
      ) {
        window.clearTimeout(timeout);
        installing!.removeEventListener("statechange", change);
        if (installing!.state === "activated") resolve();
        else reject(Error("Falha ao iniciar os avisos."));
      }
    }
    installing.addEventListener("statechange", change);
    change();
  });
  return registration;
}
export function useDesktopNotifications() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [available, setAvailable] = useState(true);
  const refresh = useCallback(async () => {
    if (!supported()) {
      setAvailable(false);
      return;
    }
    try {
      const registration =
        await navigator.serviceWorker.getRegistration("/admin/volei/");
      const subscription = await registration?.pushManager.getSubscription();
      const result = subscription
        ? await command({ action: "status", endpoint: subscription.endpoint })
        : { enabled: false };
      setEnabled(Notification.permission === "granted" && result.enabled);
    } catch {
      setMessage(
        "Não foi possível verificar os avisos. Tente ativá-los novamente.",
      );
    }
  }, []);
  useEffect(() => {
    // Run through an async callback; subscribe to browser/account state changes.
    const timer = window.setTimeout(() => void refresh(), 0);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!supported())
        throw Error("Use um navegador compatível com notificações e HTTPS.");
      if (enabled) {
        const registration =
          await navigator.serviceWorker.getRegistration("/admin/volei/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await command({
            action: "unsubscribe",
            endpoint: subscription.endpoint,
          });
          if (!(await subscription.unsubscribe()))
            throw Error(
              "Atualize a página para conferir se os avisos foram desativados.",
            );
        }
        setEnabled(false);
        setMessage("Avisos desativados neste navegador.");
        return;
      }
      // Request permission directly from the click, before any network await.
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw Error(
          "Permita notificações nas configurações deste site no navegador.",
        );
      const response = await fetch(api, { cache: "no-store" });
      const config = await response.json();
      if (!response.ok || !config.configured || !config.publicKey)
        throw Error(
          config.error || "Os avisos ainda precisam ser ativados no servidor.",
        );
      const registration = await worker();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationKey(config.publicKey),
        }));
      await command({
        action: "subscribe",
        subscription: subscription.toJSON(),
      });
      setEnabled(true);
      setMessage("Avisos ativados. Use Testar aviso para conferir a entrega.");
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "Não foi possível configurar os avisos.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const registration =
        await navigator.serviceWorker.getRegistration("/admin/volei/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) throw Error("Ative os avisos primeiro.");
      await command({ action: "test", endpoint: subscription.endpoint });
      setMessage(
        "Teste enviado. Confira as notificações e o modo Não Perturbe do computador.",
      );
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Falha ao enviar teste.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { enabled, available, busy, message, toggle, test };
}
export function DesktopNotifications({
  enabled,
  available,
  busy,
  message,
  toggle,
  test,
}: ReturnType<typeof useDesktopNotifications>) {
  return (
    <section className="vn-desktop" aria-label="Avisos no computador">
      <strong>Avisos no computador</strong>
      <p>
        Novos pedidos de cadastro e confirmações de presença, mesmo com a aba
        fechada. Os avisos exibem nome e data neste computador.
      </p>
      {available ? (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={toggle}
          >
            {busy
              ? "Aguarde…"
              : enabled
                ? "Desativar avisos neste navegador"
                : "Ativar avisos neste navegador"}
          </Button>
          {enabled && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={test}
            >
              Testar aviso
            </Button>
          )}
        </>
      ) : (
        <p>
          Este navegador não oferece suporte aos avisos. Use Chrome, Edge,
          Firefox ou Safari atualizado no computador.
        </p>
      )}
      <p>
        Não é necessário manter o site aberto. A entrega depende do navegador,
        da conexão e das permissões do sistema.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
