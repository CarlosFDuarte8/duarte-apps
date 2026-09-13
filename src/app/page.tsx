import { Hero } from "@/components/home/hero";
import { About } from "@/components/home/about";
import { Projects } from "@/components/home/projects";
import { Experience } from "@/components/home/experience";
import { Contact } from "@/components/home/contact";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Projects />
      <Experience />
      <Contact />
    </main>
  );
}
