# Portfolio de Carlos Duarte

Next.js (App Router), React e TypeScript.

## Escalas CCB INCRA-08

O sistema de escalas está em `/escalas`, com administração em `/admin`.
Consulte [o guia de configuração](docs/ESCALAS.md) para migrations, Supabase,
primeiro administrador, importação dos PDFs de 2026, testes e execução local.
O projeto usa Yarn 4: `yarn install --immutable`, `yarn dev`, `yarn lint`,
`yarn typecheck`, `yarn test` e `yarn build`.

## Desenvolvimento

Execute yarn install --immutable e yarn dev. Abra http://localhost:3000.
Valide com yarn lint, yarn typecheck, yarn test e yarn build.

## Estrutura

- src/app: rotas, metadados e layout.
- src/components/layout: cabecalho e rodape compartilhados.
- src/components/home: secoes do portfolio.
- src/components/projects: cartao reutilizavel de projeto.
- src/components/ui: marca, icones, rotulo de secao e tags.
- src/data: projetos, tecnologias e contato.

## Projetos e carrossel

Cadastre novos projetos em `src/data/projects.ts`, com um `number` único. O carrossel usa essa lista automaticamente, avança a cada seis segundos e oferece setas, indicadores, teclado e navegação por toque. A reprodução pausa ao interagir e respeita movimento reduzido, a visibilidade da seção e da aba.

Para adicionar botões a um projeto, preencha o campo opcional `links`:

```ts
links: [
  { label: "Acessar projeto", href: "https://seu-projeto.com" },
  { label: "Ver código", href: "https://github.com/seu-usuario/seu-projeto" },
],
```

Use os endereços reais. Links externos abrem em uma nova aba; sem `links`, o cartão fica sem botões de acesso. A política do NutriGo continua acessível apenas pelo rodapé.

## Configuração dos contatos

Os campos de `src/data/site.ts` alimentam os botões da seção Conversar.
Configure em `.env.local` e na hospedagem:

```dotenv
CONTACT_WHATSAPP=https://wa.me/SEU_NUMERO_COM_DDI
CONTACT_LINKEDIN=https://www.linkedin.com/in/SEU_PERFIL
CONTACT_GITHUB=https://github.com/SEU_USUARIO
CONTACT_EMAIL=SEU_EMAIL
```

Substitua os exemplos pelos valores reais. O WhatsApp usa o número com DDI e DDD, somente dígitos. Campos vazios não geram botões. Reinicie o servidor de desenvolvimento após configurar; em produção, faça uma nova compilação/publicação.

## Política do NutriGo

Politica: /nutrigo/privacy-policy. Link apenas no rodape.
/privacy-policy e /privacy-policy/page redirecionam para essa rota.

Antes de publicar:

1. Configure CONTACT_EMAIL em .env.local e na hospedagem com o contato real. Sem ela, o e-mail e o botao de contato ficam ocultos. Recompile depois de alterar.
2. Confirme o responsavel em src/data/site.ts e revise o texto em src/app/nutrigo/privacy-policy/page.tsx conforme o app real. O texto foi reaproveitado, sem auditoria do NutriGo.
3. Execute as validacoes e publique o site.
4. Use https://SEU-DOMINIO/nutrigo/privacy-policy no cadastro do aplicativo, substituindo SEU-DOMINIO pelo dominio publicado.

O servidor local nao fornece uma URL publica. Nenhuma hospedagem foi configurada neste repositorio.
