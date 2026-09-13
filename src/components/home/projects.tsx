import { SectionLabel } from "../ui/section-label";
import { projects } from "@/data/projects";
import { ProjectCard } from "../projects/project-card";
import { Carousel } from "../ui/carousel";

export function Projects() {
  return (<section className="projects section" id="projetos">
        <div className="shell">
          <div className="section-heading">
            <div><SectionLabel number="02">PROJETOS SELECIONADOS</SectionLabel><h2>Trabalhos que contam<br />uma parte da minha história.</h2></div>
            <p>Produtos reais, problemas complexos e soluções construídas com atenção aos detalhes.</p>
          </div>
          <Carousel
            label="Projetos selecionados"
            slides={projects.map((project) => ({
              id: project.number,
              label: project.title,
              content: <ProjectCard project={project} />,
            }))}
          />
        </div>
      </section>);
}
