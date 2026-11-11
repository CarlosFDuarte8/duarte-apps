# Web Push do administrador

Recebe novos pedidos de cadastro e confirmações de membros e convidados, mesmo sem uma aba do site aberta. Não usa Expo/EAS nem conta Apple Developer. O app nativo permanece disponível para controle dos jogos, sem ativar push nativo.

## Ativação em produção

1. Revise e aplique **somente** `supabase/migrations/202611100001_volei_web_push.sql` no Supabase existente. Não reexecute migrations anteriores. Esta migration é independente da antiga preparação de push Expo `202610290002_volei_push_notifications.sql`, que não precisa ser aplicada para Web Push. Cria tabelas privadas de inscrições e fila, funções exclusivas do servidor e gatilhos nas tabelas existentes. Não altera políticas existentes.
2. Gere as chaves uma única vez com `node --import tsx scripts/prepare-web-push.mts`. O arquivo `supabase/private/web-push.env` é ignorado pelo Git; o comando não imprime segredos nem substitui um arquivo existente. Preserve o par VAPID: trocar a chave exige registrar os navegadores novamente.
3. `VOLEI_WEB_PUSH_SUBJECT` já usa a URL do site; também pode usar um e-mail real `mailto:...`. Configure no servidor Vercel os valores `VOLEI_WEB_PUSH_PUBLIC_KEY`, `VOLEI_WEB_PUSH_PRIVATE_KEY`, `VOLEI_WEB_PUSH_SUBJECT` e `VOLEI_WEB_PUSH_CRON_SECRET`. Nunca use NEXT_PUBLIC para a chave privada ou segredo. O frontend recebe apenas a chave pública por rota autenticada.
4. Publique o web e habilite `VOLEI_WEB_PUSH_ENABLED=true` somente quando o banco, as chaves e o agendamento estiverem prontos. O servidor já usa SUPABASE_SERVICE_ROLE_KEY; essa chave permanece apenas no servidor.
5. Como a Vercel é Hobby, use **Supabase Cron**, com `pg_cron` e `pg_net`, em vez de cron por minuto na Vercel. Ative essas duas extensões no painel Supabase. No Vault, cadastre o segredo `volei_web_push_cron_secret` com o MESMO valor de `VOLEI_WEB_PUSH_CRON_SECRET` configurado na Vercel; não use a chave service_role nesse campo. Depois revise e execute separadamente `supabase/web-push-cron.sql`. Ele agenda `volei-web-push` a cada minuto e chama o endpoint somente quando há itens elegíveis, evitando chamadas ociosas à Vercel. O segredo é lido do Vault e enviado em cabeçalho, nunca na URL ou no SQL versionado. O agendamento não foi executado automaticamente. Para parar: `select cron.unschedule('volei-web-push');`. O histórico do cron confirma execução SQL, não a resposta HTTP; confira também `net._http_response.status_code` e a fila. A fila temporária interna do pg_net contém o cabeçalho durante a requisição, portanto restrinja o acesso ao banco e ao painel aos administradores.
6. No computador, abra o painel HTTPS, entre como administrador e use **sino → Ativar avisos neste navegador**. Autorize o navegador e depois use **Testar aviso**. Esse teste passa pelo provedor de push de verdade; não é só uma notificação local.
7. Feche a aba. Em outro navegador, faça um cadastro pendente ou confirme uma presença em um jogo atual/futuro. Aguarde o agendamento e verifique o aviso. Clicar abre o jogo ou a central; login continua obrigatório.

## Comportamento e limites

- Cadastros: apenas entrada no estado pending. Editar um cadastro que já está pendente não repete.
- Presença: entrada em confirmado de membro ou convidado. Promoções da espera e confirmações administrativas também avisam. Check-in de quem já está confirmado não repete. Jogos passados não enfileiram avisos.
- As notificações exibem nome e data no computador. Não incluem telefone, fotos, token de acesso nem conteúdo de relatos. A inscrição é vinculada ao administrador autenticado.
- Não há aviso retroativo: só eventos criados após o registro do navegador.
- Pode receber sem a aba aberta; o navegador e o sistema precisam permitir serviços em segundo plano e notificações. Computador desligado, sem conexão, modo Não Perturbe ou navegador totalmente encerrado podem impedir ou atrasar a entrega.
- Inscrições expiram em 90 dias, renovadas ao voltar ao painel. O servidor verifica se o usuário ainda é administrador antes de enviar. Respostas 404/410 removem inscrições inválidas. Ao trocar de conta e ativar, a inscrição antiga e sua fila são substituídas atomicamente.
- Desativar no sino remove a inscrição. Sair da conta tenta remover o registro deste navegador no servidor, sem desligar outros computadores; se houver falha de rede/servidor, a saída continua e a inscrição pode permanecer até expirar. Em computador compartilhado, desative e confirme antes de sair. Mensagens já em trânsito não podem ser recolhidas.
- A fila usa leases para concorrência e até cinco tentativas. Mantém itens por sete dias, tenta itens de até 24 horas e define validade de uma hora no provedor. A aceitação pelo provedor não confirma exibição. Falhas ambíguas podem gerar repetição; a tag por item reduz duplicatas no navegador.
- O service worker é exclusivo para push: não intercepta fetch, não armazena páginas administrativas e não adiciona modo offline.

## Estado desta implementação

Ativado no servidor em 10/11/2026:

- Migration 202611100001 aplicada ao Supabase real e registrada no histórico existente. Migrations anteriores preservadas.
- pg_cron e pg_net habilitados; segredo do agendador guardado no Vault.
- Job volei-web-push ativo a cada minuto, sem chamadas HTTP quando não há itens elegíveis.
- Variáveis de Web Push configuradas na produção Vercel, com chave privada e segredo tratados como secretos.
- Deploy dpl_C61gRvmedEjgpCbYm18ueKq3TLDs publicado em https://duarte-apps.vercel.app.
- Verificação no domínio: configuração administrativa e envio sem autenticação retornam 401; service worker retorna 200 e confere com o código local; envio autorizado retorna 200 com fila vazia.

Ainda falta o administrador ativar os avisos pelo sino e conceder a permissão do navegador. Não foi enviada notificação real porque ainda não há inscrição de navegador. Depois de ativar, usar Testar aviso e validar com a aba fechada e uma solicitação de homologação. As chaves VAPID e o segredo continuam em supabase/private/web-push.env, ignorado pelo Git e pela publicação; os valores não foram impressos.

Referências: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [agendamento com Vault](https://supabase.com/docs/guides/functions/schedule-functions), [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), [web-push Node](https://github.com/web-push-libs/web-push), [Service Worker showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification).
