<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Padrão visual da área de vôlei

- Todas as rotas públicas e administrativas de vôlei usam `VoleiShell`, que fornece um único `VolleyPage`. Não adicione outro `main` ou outro fundo de página dentro das telas.
- Reutilize `VolleyPageHeader`/`VolleyHero`, `VolleyCard`, `VolleyFormCard`, `VolleySectionHeader`, `VolleyMetric` e `VolleyMetrics` em `src/components/volei`. Use os controles compartilhados de `src/components/ui` e `PhoneInput` para telefones.
- Fontes, alturas, raios e espaçamentos ficam em `design-tokens.css`; os controles comuns ficam em `primitives.css`. CSS de tela deve compor o layout, sem redefinir a aparência básica de cada campo, botão ou card. Crie variantes compartilhadas quando houver uma necessidade nova.
- Preserve os dois temas, o comportamento responsivo, os estados de carregamento e as ações existentes. Portaria/impressão e modo de jogo em tela cheia mantêm suas necessidades específicas de apresentação.
