import { SectionLabel } from "../ui/section-label";
import { projects } from "@/data/projects";
import { ProjectCard } from "../projects/project-card";
import { Reveal } from "../ui/reveal";

export function Projects() {
  return (<section className="projects section" id="projetos">
        <div className="shell">
          <div className="section-heading">
            <div><SectionLabel number="02">PROJETOS SELECIONADOS</SectionLabel><h2>Trabalhos que contam<br />uma parte da minha história.</h2></div>
            <p>Produtos reais, problemas complexos e soluções construídas com atenção aos detalhes.</p>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <Reveal key={project.title}><ProjectCard project={project} /></Reveal>
            ))}
          </div>
        </div>
      </section>);
}
