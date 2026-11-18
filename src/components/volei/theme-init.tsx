"use client";

import { volleyThemeScript } from "@/lib/volei/theme";

export function ThemeInit() {
  return (
    <script
      id="volley-theme-init"
      // Execute while parsing the initial HTML. React inserts an inert script
      // if it needs to render the document again on the client.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: volleyThemeScript }}
    />
  );
}
