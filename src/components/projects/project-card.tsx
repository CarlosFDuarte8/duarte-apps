import type { Project } from "@/data/projects";
import { TagList } from "../ui/tag-list";
import Link from "next/link";
import Image from "next/image";
import { ArrowIcon } from "../ui/icons";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={`project-card ${project.tone}`}>
      <div className="project-number">{project.number}</div>
      <div className="project-content">
        <span className="project-eyebrow">{project.eyebrow}</span>
        <h3>{project.title}</h3>
        <p>{project.description}</p>
        <TagList items={project.stack} />
        {project.links && project.links.length > 0 && (
          <div className="project-actions">
            {project.links.map((link, index) => {
              const external = /^https?:\/\//i.test(link.href);
              return (
                <Link
                  key={link.href}
                  className={`button ${index === 0 ? "button-primary" : "button-ghost"}`}
                  href={link.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                >
                  {link.label} <ArrowIcon />
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <div className="project-art" aria-hidden="true">
        {project.image ? (
          <Image
            src={project.image}
            alt=""
            fill
            sizes="(max-width: 900px) 100vw, 420px"
            className="project-art-image"
          />
        ) : (
          <>
            <div className="art-grid" />
            <span>{project.number}</span>
          </>
        )}
      </div>
    </article>
  );
}
