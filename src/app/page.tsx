import { Hero } from "@/components/home/hero";
import { About } from "@/components/home/about";
import { Projects } from "@/components/home/projects";
import { Experience } from "@/components/home/experience";
import { Contact } from "@/components/home/contact";
import { Reveal } from "@/components/ui/reveal";

export default function Home() {
  return (
    <main>
      <Hero />
      <Reveal><About /></Reveal>
      <Projects />
      <Reveal><Experience /></Reveal>
      <Reveal><Contact /></Reveal>
    </main>
  );
}
