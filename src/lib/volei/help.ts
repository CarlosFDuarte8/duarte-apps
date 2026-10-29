export const helpSections = [
  {
    title: "Telefone e navegador",
    items: [
      [
        "Posso usar mais de um telefone no mesmo navegador?",
        "Cada perfil de navegador fica vinculado a um único telefone de membro. O mesmo telefone também fica vinculado a esse navegador. Convidados devem ser cadastrados como convidados, sem trocar o telefone do membro.",
      ],
      [
        "Troquei de aparelho ou navegador. E agora?",
        "Peça ao administrador para liberar seu acesso. Depois, abra o site no navegador que deseja usar e informe o mesmo telefone, com código do país e DDD. O primeiro acesso após a liberação cria o novo vínculo.",
      ],
      [
        "Limpei os cookies ou usei uma aba anônima",
        "O reconhecimento depende de um cookie. Limpar os dados do site ou encerrar uma sessão anônima pode fazer você perder esse reconhecimento. Peça a liberação ao administrador e prefira o navegador habitual, fora do modo anônimo.",
      ],
      [
        "Posso compartilhar o navegador com outro membro?",
        "Prefira perfis separados do navegador ou aparelhos diferentes. Para substituir o membro associado a um navegador, o administrador deve liberar o vínculo anterior; isso não cria acesso simultâneo para duas pessoas.",
      ],
    ],
  },
  {
    title: "Ajuda para administradores",
    items: [
      [
        "Como libero o acesso pelo app?",
        "Abra Membros, procure a pessoa e entre no perfil. Em Gerenciar cadastro, toque em Liberar acesso em outro navegador e confirme. Salve ou descarte alterações pendentes antes. Não é necessário abrir o sistema web.",
      ],
      [
        "Como libero o acesso pelo sistema web?",
        "No painel administrativo, abra Membros, entre no perfil da pessoa e use a opção de liberar o acesso do navegador.",
      ],
      [
        "O que acontece ao liberar?",
        "Confirme a identidade do membro antes de liberar. O vínculo atual é removido, e o membro precisa informar o telefone novamente no navegador escolhido. Nome, telefone, inscrições, presenças e histórico são preservados. A liberação não aprova, desbloqueia ou reativa o cadastro.",
      ],
      [
        "A liberação não funcionou",
        "Confira o telefone cadastrado, incluindo país e DDD. Peça ao membro para atualizar a página e informar o mesmo número. Se o cadastro estiver pendente, bloqueado ou inativo, confira também essa situação no perfil.",
      ],
    ],
  },
] as const;
