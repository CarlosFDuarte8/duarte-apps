# Alunos por dia de aula

Migration: `202611110001_volei_students.sql`, aplicada no Supabase em 11/11/2026. Não reexecute migrations anteriores.

- O administrador marca **É aluno** e seleciona os dias ao cadastrar ou editar o membro, tanto no web quanto no app.
- No cadastro público, **Sou aluno** registra `requested_student_weekdays`. Os dias permanecem pendentes mesmo após aprovar o cadastro do membro.
- No perfil administrativo, **Aluno e dias de aula** permite conferir, corrigir e salvar os dias. Desmarcar **É aluno** e salvar recusa a solicitação ou remove o vínculo.
- `student_weekdays` contém apenas dias aprovados. Uma lista vazia significa que não há vínculo de aluno.
- A prioridade na fila vale somente no dia de aula aprovado. Alunos e grupo principal usam a mesma faixa prioritária; dentro dela, vale a ordem de inscrição.
- O aluno precisa se inscrever no jogo. Não há confirmação automática nem retirada de vagas já confirmadas. As reservas existentes do grupo principal continuam com a regra anterior.
- Grupo principal, preferências pessoais e dias de aula são informações independentes.

O RPC público é exclusivo de `service_role`, usado somente pelo servidor. Ele não altera declarações nem dias aprovados de membros já existentes. A revisão usa a sessão administrativa e compara os dias anteriores e a solicitação para evitar sobrescritas concorrentes.

Não foram recriadas tabelas nem alteradas políticas RLS. A migration adiciona campos e RPCs e modifica somente a ordenação das funções de preenchimento de vagas.

Validação: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Os testes SQL estão em `supabase/students.test.ts` e usam um banco temporário local, sem cadastrar membros reais.
