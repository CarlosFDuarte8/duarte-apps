import { SectionLabel } from "../ui/section-label";

export function About() {
  return (<section className="about shell section" id="sobre">
        <SectionLabel number="01">SOBRE MIM</SectionLabel>
        <div className="about-grid">
          <h2>Código bom resolve.<br /><em>Produto bom transforma.</em></h2>
          <div className="about-copy">
            <p>Sou um desenvolvedor curioso por natureza e pragmático na execução. Gosto de entender o problema por inteiro antes de transformar requisitos complexos em experiências simples.</p>
            <p>Hoje trabalho principalmente com <strong>React Native, React e .NET</strong>, participando de todo o ciclo do produto — da conversa com o cliente ao deploy.</p>
            <div className="values">
              <span><i>✓</i> Compromisso com entregas</span>
              <span><i>✓</i> Comunicação clara</span>
              <span><i>✓</i> Aprendizado contínuo</span>
              <span><i>✓</i> Olhar para o produto</span>
            </div>
          </div>
        </div>
      </section>);
}
