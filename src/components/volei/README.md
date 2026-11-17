# Interface do vôlei

O padrão atende às rotas `/volei` e `/admin/volei`. `VoleiShell` fornece a navegação e um único `VolleyPage`, incluindo fundo, largura, respiros e adaptação para celular.

## Componentes

- `VolleyPageHeader`: cabeçalho de página com título, descrição e ações. Use `VolleyHero` diretamente apenas quando precisar da variante de destaque do login.
- `VolleyCard` e `VolleyFormCard`: painéis e formulários. `VolleyCard` aceita `as="section"`, `as="article"`, `as="header"` e `as="aside"` para manter a semântica.
- `VolleySectionHeader`: título, descrição, ícone e ações de uma seção.
- `VolleyHeroDetail`: status, valor e informação auxiliar dentro do cabeçalho, como o prazo de inscrição do encontro.
- `VolleyMetric`: indicador comum, com opções de link, filtro por clique, ícone e tom.
- `VolleyMetrics`: grade responsiva dos indicadores; mantém as mesmas colunas e espaçamentos nas diferentes telas.
- `Button`, `Input`, `NativeSelect`, `Textarea` e `InputGroup`: controles compartilhados. `Button` oferece `loading`/`loadingText`, `variant` e `size`; `PhoneInput` mantém a formatação internacional.

## Medidas e temas

`design-tokens.css` concentra a escala: corpo de 14 px, rótulos de 13 px, texto auxiliar de 12 px, seções de 20 px e controles de 48 px. Os campos usam 16 px no celular para evitar zoom ao receber foco. Cards usam os tokens de raio, preenchimento e sombra; barras de ferramentas podem usar `size="sm"` e ícones usam `size="icon"`.

`primitives.css` aplica o contrato dos controles apenas à área do vôlei. As cores vêm dos tokens `--vm-*` de `color-mode.css`, incluindo diálogos e o tema escuro. CSS de tela descreve grades, colunas e posições. Para alterar uma medida global, ajuste o token; para uma exceção recorrente, acrescente uma variante ao componente.

A folha de impressão da portaria e o placar em tela cheia preservam seu formato específico. Não remova os estilos de impressão ao ajustar a apresentação na tela.

## Validação

Execute `npm run typecheck`, `npm test` e `npm run test:e2e`. Os testes de navegador usam o Supabase simulado em `e2e/supabase-fixture.mjs`; as credenciais fictícias e a sessão de administrador desse servidor não concedem acesso ao ambiente real.

## Grupo do WhatsApp

`WhatsAppGroupCard` e `WhatsAppGroupPrint` reutilizam o convite configurado em `/admin/volei/configuracoes`. A geração do QR code e a leitura do banco ficam no servidor. A lista local usa um componente cliente separado para receber o mesmo convite sem perder os dados do navegador. Veja [configuração e manutenção](./WHATSAPP.md).

## Nascimento e identificação de menores

`BirthDateField` é compartilhado entre inscrição, confirmação e edição de perfil. Novos membros precisam informar nascimento; membros antigos completam a data na próxima confirmação, inclusive pelo link individual. O banco salva data e confirmação na mesma transação. Não apaga datas já preenchidas, e preserva cancelamentos e aprovações administrativas.

Datas e idades ficam no cadastro privado e no painel administrativo. As páginas de jogo recebem apenas `needsBirthDate` do próprio participante; as listas públicas e folhas de impressão não incluem nascimento ou idade. Os filtros administrativos separam menores de 18, maiores e nascimento desconhecido; idade usa a data de Brasília e muda no aniversário.

A migration `202611170002_volei_birth_dates.sql` mantém cadastros antigos sem nascimento. Números continuam únicos em E.164 e dispositivos continuam únicos. Um índice adicional evita nome completo + nascimento repetidos, ignorando acentos, caixa e espaços extras. Homônimos com datas diferentes são permitidos. Um novo pedido com o mesmo nome de um cadastro antigo sem data orienta a recuperar o cadastro com o responsável. A importação da lista antiga continua sendo uma recuperação de legado; os importados completam nascimento ao confirmar presença.
