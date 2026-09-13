import type { Project } from "@/data/projects";
import { TagList } from "../ui/tag-list";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={`project-card ${project.tone}`}>
      <div className="project-number">{project.number}</div>
      <div className="project-content">
        <span className="project-eyebrow">{project.eyebrow}</span>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <TagList items={project.stack} />
      </div>
      <div className="project-art" aria-hidden="true"><div className="art-grid" /><span>{project.number}</span></div>
    </article>
  );
}
