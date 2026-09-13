import { SectionLabel } from "../ui/section-label";
import { skills } from "@/data/skills";
import { TagList } from "../ui/tag-list";

export function Experience() {
  return (<section className="experience shell section" id="experiencia">
        <SectionLabel number="03">EXPERIÊNCIA &amp; STACK</SectionLabel>
        <div className="experience-grid">
          <div>
            <h2>Tecnologia é ferramenta.<br /><em>Resolver é o objetivo.</em></h2>
            <div className="timeline">
              <article><span className="timeline-dot" /><div className="role-line"><h3>Desenvolvedor Full Stack</h3><small>2021 — agora</small></div><strong>INV Tecnologia</strong><p>Aplicações mobile e web, APIs, integrações, arquitetura, revisão de código e contato próximo com clientes.</p></article>
              <article><span className="timeline-dot muted" /><div className="role-line"><h3>Técnico de manutenção</h3><small>2012 — 2021</small></div><strong>Autônomo</strong><p>Quase uma década resolvendo problemas técnicos e construindo uma base sólida de atendimento e responsabilidade.</p></article>
            </div>
          </div>
          <aside className="stack-card">
            <span className="stack-label">CAIXA DE FERRAMENTAS</span>
            <h3>O que uso para construir</h3>
            <TagList items={skills} className="skill-cloud" />
            <div className="learning"><span>↗</span><div><strong>Aprendendo sempre</strong><small>Explorando IA, arquitetura e novas formas de criar produtos melhores.</small></div></div>
          </aside>
        </div>
      </section>);
}
