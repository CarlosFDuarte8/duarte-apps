/** Resolves only when a clipboard method confirms success. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    const previous = document.activeElement;
    try {
      area.select();
      if (!document.execCommand("copy")) throw new Error("Falha ao copiar.");
    } finally {
      area.remove();
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    }
  }
}
