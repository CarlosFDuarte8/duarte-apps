# Portfolio de Carlos Duarte

Next.js (App Router), React e TypeScript.

## Desenvolvimento

Execute npm ci e npm run dev. Abra http://localhost:3000.
Valide com npm run lint e npm run build.

## Estrutura

- src/app: rotas, metadados e layout.
- src/components/layout: cabecalho e rodape compartilhados.
- src/components/home: secoes do portfolio.
- src/components/projects: cartao reutilizavel de projeto.
- src/components/ui: marca, icones, rotulo de secao e tags.
- src/data: projetos, tecnologias e contato.

## Política do NutriGo

Politica: /nutrigo/privacy-policy. Link apenas no rodape.
/privacy-policy e /privacy-policy/page redirecionam para essa rota.

Antes de publicar:

1. Configure CONTACT_EMAIL em .env.local e na hospedagem com o contato real. Sem ela, o e-mail e o botao de contato ficam ocultos. Recompile depois de alterar.
2. Confirme o responsavel em src/data/site.ts e revise o texto em src/app/nutrigo/privacy-policy/page.tsx conforme o app real. O texto foi reaproveitado, sem auditoria do NutriGo.
3. Execute as validacoes e publique o site.
4. Use https://SEU-DOMINIO/nutrigo/privacy-policy no cadastro do aplicativo, substituindo SEU-DOMINIO pelo dominio publicado.

O servidor local nao fornece uma URL publica. Nenhuma hospedagem foi configurada neste repositorio.
