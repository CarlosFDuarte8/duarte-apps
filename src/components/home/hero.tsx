import { ArrowIcon } from "../ui/icons";

export function Hero() {
  return (<section className="hero shell">
        <div className="hero-copy">
          <div className="availability"><span /> Disponível para novos desafios</div>
          <h1>Transformo ideias em<br /><em>produtos digitais.</em></h1>
          <p>
            Desenvolvedor Full Stack com mais de 5 anos criando aplicações mobile e web que conectam tecnologia, pessoas e resultados.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#projetos">Ver meus projetos <ArrowIcon /></a>
            <a className="button button-ghost" href="#sobre">Conhecer minha trajetória</a>
          </div>
          <div className="hero-metrics">
            <div><strong>5+</strong><span>anos de<br />experiência</span></div>
            <div><strong>10+</strong><span>tecnologias<br />no dia a dia</span></div>
            <div><strong>3</strong><span>plataformas<br />mobile, web e API</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-label="Ilustração de código e tecnologia">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="code-window">
            <div className="window-bar"><span /><span /><span /><small>carlos.tsx</small></div>
            <pre><code><span className="purple">const</span> developer = {'{'}{"\n"}  name: <span className="green">&quot;Carlos Duarte&quot;</span>,{"\n"}  focus: [<span className="green">&quot;Mobile&quot;</span>, <span className="green">&quot;Web&quot;</span>],{"\n"}  mindset: <span className="blue">buildWithPurpose</span>,{"\n"}  learning: <span className="purple">true</span>{"\n"}{'}'};</code></pre>
            <div className="terminal"><span>→</span> criando experiências que fazem diferença<span className="cursor" /></div>
          </div>
          <div className="floating-card card-mobile"><span>RN</span><div><strong>Mobile first</strong><small>React Native</small></div></div>
          <div className="floating-card card-api"><span>{'{ }'}</span><div><strong>APIs robustas</strong><small>.NET • Node • Java</small></div></div>
        </div>
      </section>);
}
