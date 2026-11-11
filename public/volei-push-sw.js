// Dedicated push worker: no fetch handler, offline cache, or private page storage.
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    data = {};
  }
  const href =
    typeof data.href === "string" && /^\/admin\/volei(?:[/?]|$)/.test(data.href)
      ? data.href
      : "/admin/volei/notificacoes";
  event.waitUntil(
    self.registration.showNotification(data.title || "Quadra", {
      body: data.body || "Há novidades no grupo de vôlei.",
      tag: data.id || "volei-update",
      data: { href },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href;
  const path =
    typeof href === "string" && /^\/admin\/volei(?:[/?]|$)/.test(href)
      ? href
      : "/admin/volei/notificacoes";
  event.waitUntil(
    (async () => {
      const url = new URL(path, self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin + "/admin/volei")) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
