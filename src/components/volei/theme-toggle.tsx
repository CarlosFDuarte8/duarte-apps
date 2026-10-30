"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark" | "system";
const key = "volley-theme";
let fallback: Theme = "system";
function preference(): Theme {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" || value === "system" ? value : fallback;
  } catch {
    return fallback;
  }
}
function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener("volley-theme-changed", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("volley-theme-changed", callback);
    media.removeEventListener("change", callback);
  };
}
function snapshot() {
  const theme = preference();
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  return `${theme}:${dark ? "dark" : "light"}`;
}
const serverSnapshot = () => "system:light";

export function ThemeToggle() {
  const [theme, resolved] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split(":");
  useEffect(() => {
    document.documentElement.dataset.volleyTheme = resolved;
    return () => { delete document.documentElement.dataset.volleyTheme; };
  }, [resolved]);
  function select(value: Theme) {
    fallback = value;
    try { localStorage.setItem(key, value); } catch { /* Preference remains available for this session. */ }
    window.dispatchEvent(new Event("volley-theme-changed"));
  }
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="ghost" size="icon" className="volley-header-icon volley-theme-toggle" aria-label="Escolher tema" title="Escolher tema">
          {resolved === "dark" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="volley-theme-menu" align="end" sideOffset={8} collisionPadding={12} aria-label="Tema da aparência">
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => select(value as Theme)}>
            {([
              ["light", "Claro", Sun], ["dark", "Escuro", Moon], ["system", "Sistema", Monitor],
            ] as const).map(([value, label, Icon]) => (
              <DropdownMenu.RadioItem value={value} key={value} className="volley-theme-option">
                <Icon aria-hidden="true" /><span>{label}</span>
                <DropdownMenu.ItemIndicator><Check aria-hidden="true" /></DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
