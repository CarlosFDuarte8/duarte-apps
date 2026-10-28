import Link from "next/link";
import { site } from "@/data/site";

const LAST_UPDATED = "10 de setembro de 2026";

export const metadata = {
  title: "Política de Privacidade — NutriGo",
  description: "Política de privacidade do aplicativo NutriGo.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="privacy-page shell">
      <div className="privacy-content">
        <Link className="privacy-back" href="/#projetos">← Voltar aos projetos</Link>
        <h1>Política de Privacidade — NutriGo</h1>
        <p className="privacy-updated">Última atualização: {LAST_UPDATED}</p>

        <p>
          Esta Política de Privacidade descreve como o aplicativo <strong>NutriGo</strong> (&quot;app&quot;, &quot;nós&quot;)
          trata as informações dos usuários. Ao usar o app, você concorda com os termos descritos aqui.
        </p>

        <h2>1. Dados armazenados apenas no seu dispositivo</h2>
        <p>
          O NutriGo <strong>não possui servidor próprio nem sistema de login/conta</strong>. As informações
          abaixo ficam salvas exclusivamente no armazenamento local do seu dispositivo (AsyncStorage) e nunca
          são enviadas para nós:
        </p>
        <ul>
          <li>Perfis criados no app: nome, altura, peso, objetivo, preferências e restrições alimentares;</li>
          <li>Histórico de refeições registradas e o progresso do desafio de 15 dias;</li>
          <li>Refeições favoritas;</li>
          <li>Planejamento semanal de refeições e listas de compras, incluindo preços informados por você.</li>
        </ul>
        <p>
          Se você desinstalar o app ou limpar os dados dele nas configurações do sistema, todas essas
          informações são apagadas permanentemente e não podem ser recuperadas por nós, pois nunca tivemos
          acesso a elas.
        </p>

        <h2>2. Assistente com Inteligência Artificial</h2>
        <p>
          O app oferece um assistente de chat com IA. As mensagens que você digita nessa tela são enviadas
          diretamente para os servidores da <strong>OpenAI</strong> (fornecedora do modelo de IA) para gerar
          uma resposta, e são processadas de acordo com a{" "}
          <a
            href="https://openai.com/policies/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
           
          >
            Política de Privacidade da OpenAI
          </a>
          . Recomendamos não incluir dados sensíveis (como documentos, dados de saúde detalhados de
          terceiros ou informações financeiras) nas mensagens enviadas ao assistente.
        </p>

        <h2>3. Autenticação biométrica</h2>
        <p>
          O app pode usar a biometria do seu aparelho (digital ou reconhecimento facial) apenas para
          proteger o acesso ao próprio app. Essa verificação é feita inteiramente pelo sistema operacional
          do seu dispositivo — o NutriGo <strong>não recebe, não armazena e não tem acesso</strong> aos
          seus dados biométricos em nenhum momento.
        </p>

        <h2>4. Compartilhamento de dados</h2>
        <p>
          Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de
          publicidade. O único compartilhamento existente é o envio das mensagens do assistente de IA para
          a OpenAI, descrito na seção 2. O app não utiliza ferramentas de analytics, rastreamento de
          comportamento ou exibição de anúncios.
        </p>

        <h2>5. Seus direitos</h2>
        <p>
          Como todos os seus dados de uso ficam apenas no seu dispositivo, você pode a qualquer momento
          visualizar, editar ou excluir essas informações diretamente pelas telas do app (perfis, histórico,
          favoritos e planejamento), ou removê-las por completo desinstalando o aplicativo. Em caso de
          dúvidas sobre o tratamento de dados, entre em contato pelo e-mail informado na seção 7.
        </p>

        <h2>6. Crianças e adolescentes</h2>
        <p>
          O NutriGo não é direcionado a menores de 13 anos e não coleta intencionalmente dados de crianças.
        </p>

        <h2>7. Contato</h2>
        <p>
          Responsável pelo NutriGo: {site.developerName}.
          {site.contactEmail && <> Em caso de dúvidas sobre esta Política de Privacidade, entre em contato pelo e-mail: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.</>}
        </p>

        <h2>8. Alterações nesta política</h2>
        <p>
          Esta política pode ser atualizada periodicamente para refletir mudanças no app. A data da última
          atualização está sempre indicada no topo desta página.
        </p>
      </div>
    </main>
  );
}
