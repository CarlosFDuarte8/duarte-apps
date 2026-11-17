# Convite do grupo do WhatsApp

No painel do vôlei, abra **Grupo do WhatsApp** em **Cuide do seu grupo**, ou acesse `/admin/volei/configuracoes`.

Cole o convite `https://chat.whatsapp.com/...` e salve. O botão e o QR code aparecem na página pública de jogos e na página de cada encontro. O mesmo QR code fica no canto do cabeçalho da lista da portaria e da lista de presença local, inclusive na impressão.

Deixe o campo vazio e salve para retirar o convite das páginas e das próximas impressões. Se o WhatsApp renovar o convite, substitua o link no painel e imprima as listas novamente; folhas já impressas continuam apontando para o link anterior.

Ative **Aprovar novos participantes** nas permissões do grupo no WhatsApp. O site abre o convite; as solicitações e aprovações acontecem no WhatsApp. Entrar no grupo não confirma a presença em um jogo.

## Implementação

- `whatsapp.ts`: valida e normaliza convites, removendo parâmetros de compartilhamento.
- `group-settings.ts`: lê a configuração e gera o PNG do QR code no servidor, sem serviço externo de imagens.
- `WhatsAppGroupCard` e `WhatsAppGroupPrint`: apresentações compartilhadas do mesmo convite.
- `202611170001_volei_whatsapp_group.sql`: configuração única; leitura pública e alteração restrita ao administrador pelo RLS e pela server action.

Sem link salvo, os componentes ficam ocultos. Sem a migration, as páginas existentes continuam funcionando e o formulário informa que a atualização do banco é necessária.

Os testes cobrem validação dos links, permissões no PostgreSQL, autorização da ação, publicação/remoção, temas, celular e impressão A4 com a lista cheia.
