import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VolleyCard, VolleyPageHeader, VolleySectionHeader } from "@/components/volei/page-frame";
import { site } from "@/data/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Política de Privacidade | Quadra",
  description: "Como a área de vôlei utiliza seus dados no cadastro, nas confirmações de presença e na organização dos encontros.",
};

const shortcuts = [
  ["dados", "Dados coletados"],
  ["visibilidade", "O que fica público"],
  ["navegador", "Cookies e navegador"],
  ["direitos", "Seus direitos"],
  ["contato", "Contato"],
] as const;

export default function Page() {
  return (
    <>
      <VolleyPageHeader
        eyebrow="VÔLEI DA GALERA · SEUS DADOS"
        title="Política de Privacidade"
        description="Entenda como suas informações são usadas para organizar os jogos e cuidar do grupo."
        actions={<Button asChild variant="outline"><Link href="/volei">Voltar aos jogos</Link></Button>}
      />
      <div className={styles.document}>
        <VolleyCard as="section">
          <p className={styles.updated}>Última atualização: <time dateTime="2026-11-17">17 de novembro de 2026</time>.</p>
          <p>
            Esta política se aplica à área de vôlei do Quadra, às suas páginas
            públicas e às ferramentas administrativas que usam os mesmos cadastros.
            Ela explica o tratamento de dados de membros, convidados e administradores.
          </p>
          <p>
            <strong>Nome, telefone e nascimento são necessários para solicitar um
            novo cadastro de membro.</strong> Quem já está cadastrado e ainda não
            informou nascimento precisa completar essa informação ao confirmar presença.
            Foto e contato de emergência são opcionais.
          </p>
          <nav className={styles.shortcuts} aria-label="Nesta política">
            {shortcuts.map(([id, label]) => (
              <Button asChild variant="outline" size="sm" key={id}><a href={`#${id}`}>{label}</a></Button>
            ))}
          </nav>
        </VolleyCard>

        <VolleyCard as="section" id="responsavel" className={styles.section}>
          <VolleySectionHeader title="1. Quem cuida dos dados" />
          <p>
            O responsável por esta área é {site.developerName}. A administração
            do grupo Vôlei da galera organiza os cadastros, aprova
            participantes e gerencia os encontros. Os administradores autorizados
            têm acesso às informações necessárias para essas atividades.
          </p>
          <p>Para dúvidas ou solicitações sobre seus dados, veja a seção de <a href="#contato">contato</a>.</p>
        </VolleyCard>

        <VolleyCard as="section" id="dados" className={styles.section}>
          <VolleySectionHeader title="2. Quais dados são tratados e para quê" />
          <ul>
            <li><strong>Cadastro:</strong> nome, telefone com país e DDD, nascimento, situação do cadastro e identificadores de acesso. Servem para reconhecer o participante, analisar sua entrada, evitar duplicidade e identificar menores de idade.</li>
            <li><strong>Perfil opcional:</strong> foto e nome, telefone e vínculo de um contato de emergência. A foto auxilia a identificação; o contato pode ser usado quando for necessário falar com alguém indicado por você.</li>
            <li><strong>Participação:</strong> inscrições, confirmações, cancelamentos, fila de espera, horários, convidados, chamada, frequência e histórico de pontos. Esses registros ajudam a distribuir vagas e organizar os encontros.</li>
            <li><strong>Organização do grupo:</strong> dias de aula declarados e aprovados, preferências de dias, indisponibilidades e avaliação esportiva registrada pela administração. Essas informações apoiam a agenda, os critérios de prioridade e a formação de times.</li>
            <li><strong>Relatos:</strong> quando o recurso estiver disponível para seu cadastro, o sistema registra o autor, as pessoas envolvidas, o encontro, o assunto, a descrição e o acompanhamento administrativo do relato.</li>
            <li><strong>Administração e avisos:</strong> dados de autenticação da conta administrativa e, se os avisos forem ativados, identificadores da inscrição de notificações do navegador, necessários para entregar esses avisos.</li>
          </ul>
          <p>
            Ao informar dados de um convidado ou contato de emergência, avise essa
            pessoa sobre o cadastro e compartilhe esta política. Evite incluir
            documentos, informações de saúde ou outros dados desnecessários em
            observações e relatos.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="visibilidade" className={styles.section}>
          <VolleySectionHeader title="3. O que aparece para outras pessoas" />
          <p>
            As listas públicas dos encontros mostram nomes de membros e convidados,
            situação da participação, horários de inscrição ou confirmação e,
            quando aplicável, o vínculo de aluno. Essas páginas podem ser acessadas
            por quem tiver o endereço, sem precisar entrar em uma conta.
          </p>
          <p>
            <strong>Telefone, nascimento, idade, foto, contato de emergência e
            conteúdo dos relatos não são exibidos nas listas públicas.</strong>
            Dados do próprio perfil podem ser vistos no acesso pessoal; informações
            administrativas ficam restritas aos administradores autorizados. A
            indicação de menor de idade fica no painel administrativo.
          </p>
          <p>
            A organização pode imprimir ou compartilhar a lista de nomes para a
            portaria e para os jogos, incluindo a indicação de membro ou convidado
            e o nome do responsável pelo convidado. Cópias impressas ou já
            compartilhadas precisam ser tratadas diretamente com quem as recebeu.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="menores" className={styles.section}>
          <VolleySectionHeader title="4. Crianças e adolescentes" />
          <p>
            O nascimento ajuda a administração a reconhecer participantes menores
            de 18 anos. Essa informação não é divulgada nas listas públicas.
            Preencher o cadastro não substitui a autorização de um responsável
            legal quando ela for necessária para participar das atividades.
          </p>
          <p>
            O tratamento de dados de crianças e adolescentes deve considerar seu
            melhor interesse e as exigências legais aplicáveis. Pais e responsáveis
            podem procurar a administração para esclarecer a participação e
            solicitar informações ou providências sobre os dados do menor.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="navegador" className={styles.section}>
          <VolleySectionHeader title="5. Cookies e dados no navegador" />
          <ul>
            <li><strong>Reconhecimento do membro:</strong> um cookie vincula seu cadastro ao navegador utilizado. O vínculo é configurado para durar até um ano e pode ser liberado pela administração. Limpar cookies ou usar outro aparelho pode exigir a recuperação do acesso.</li>
            <li><strong>Sessão administrativa:</strong> cookies de autenticação permitem entrar e permanecer no painel.</li>
            <li><strong>Preferência de aparência:</strong> a escolha entre tema claro, escuro ou do sistema é salva no armazenamento local do navegador.</li>
            <li><strong>Lista de presença local:</strong> a ferramenta de lista local salva os dados que você digitar nesse navegador. Esses registros não são sincronizados automaticamente com o cadastro de membros e podem ser perdidos ao limpar os dados do site.</li>
          </ul>
          <p>
            A área de vôlei não utiliza cookies de publicidade. A infraestrutura
            que entrega o site pode processar dados técnicos de acesso, como
            endereço IP, navegador, data e horário, para operação e segurança.
          </p>
          <p>
            <strong>Limpar os dados do navegador não apaga seu cadastro nem o
            histórico mantido no servidor.</strong> Para tratar desses registros,
            fale com a administração. Guarde seus links pessoais e não os
            compartilhe: eles podem permitir acesso ao seu cadastro.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="compartilhamento" className={styles.section}>
          <VolleySectionHeader title="6. Serviços utilizados e compartilhamento" />
          <p>
            O sistema utiliza o Supabase para banco de dados, autenticação e
            armazenamento de fotos, além da infraestrutura de hospedagem do site.
            Esses serviços processam informações necessárias ao funcionamento da
            plataforma. Os servidores e fornecedores podem estar em outros países.
          </p>
          <p>
            Se você usar o botão ou o QR code do WhatsApp, será direcionado a um
            serviço externo. A solicitação de entrada e os dados visíveis dentro
            do grupo seguem as configurações e políticas do WhatsApp e a gestão dos
            administradores do grupo. O site não adiciona você automaticamente.
          </p>
          <p>
            Avisos do navegador dependem de autorização e do serviço de notificações
            do próprio navegador. Administradores podem desativá-los no painel ou
            nas permissões do navegador. Informações também podem ser fornecidas
            quando houver obrigação legal ou determinação de autoridade competente.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="conservacao" className={styles.section}>
          <VolleySectionHeader title="7. Conservação e proteção" />
          <p>
            Cadastros e históricos não são apagados automaticamente ao fim de cada
            jogo. A administração considera a necessidade de organizar o grupo,
            manter o histórico, resolver solicitações e atender às exigências
            aplicáveis ao analisar a conservação, exclusão ou anonimização dos dados.
          </p>
          <p>
            O sistema restringe funções administrativas a contas autorizadas e
            mantém as fotos em armazenamento privado, com links temporários para
            exibição autorizada. Nenhum sistema elimina todos os riscos: se
            perceber um acesso indevido, procure a administração para verificar
            seu cadastro e seu vínculo de navegador.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="direitos" className={styles.section}>
          <VolleySectionHeader title="8. Seus direitos e escolhas" />
          <p>
            Você pode solicitar confirmação do tratamento, acesso e correção dos
            seus dados, informações sobre compartilhamento e, nas situações
            previstas na legislação, anonimização, bloqueio, eliminação,
            portabilidade, oposição ao tratamento e revisão de decisões
            exclusivamente automatizadas. Quando o tratamento depender de
            consentimento, você pode solicitar sua revogação.
          </p>
          <p>
            Em <Link href="/volei/meu-cadastro">Meu cadastro</Link>, é possível
            atualizar os dados disponíveis e remover a foto. Para outros pedidos,
            use o contato abaixo. A administração pode confirmar sua identidade
            para evitar entregar ou alterar dados de outra pessoa. Você também
            pode consultar as <a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares" target="_blank" rel="noopener noreferrer">orientações da ANPD sobre seus direitos</a>.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="contato" className={styles.section}>
          <VolleySectionHeader title="9. Como falar sobre seus dados" />
          <p>
            Responsável pela área de vôlei: {site.developerName}.
            {site.contactEmail && <> Para dúvidas ou solicitações sobre seus dados, escreva para <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</>}
          </p>
          <p>
            Você também pode falar com a administração do grupo Vôlei da galera pelos
            canais que você utiliza para combinar os jogos ou pelos quais recebeu
            o convite para participar.
          </p>
          <p>
            Informe seu nome, o telefone cadastrado e o que deseja consultar,
            corrigir ou excluir. Não envie senhas ou dados de terceiros que não
            sejam necessários ao atendimento.
          </p>
        </VolleyCard>

        <VolleyCard as="section" id="alteracoes" className={styles.section}>
          <VolleySectionHeader title="10. Atualizações desta política" />
          <p>
            Esta política pode ser atualizada quando houver mudanças no sistema ou
            no tratamento de dados. A data no início da página identifica a versão
            apresentada. Este texto informa como a área funciona e não representa
            uma autorização genérica para usos diferentes dos descritos.
          </p>
          <p>
            Referência: <a href="https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html" target="_blank" rel="noopener noreferrer">Lei Geral de Proteção de Dados Pessoais (LGPD)</a>.
          </p>
        </VolleyCard>
      </div>
    </>
  );
}
