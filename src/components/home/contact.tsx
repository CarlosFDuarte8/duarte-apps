import { ContactLinks } from "../ui/contact-links";

export function Contact() {
  return (<section className="contact" id="contato">
        <div className="contact-glow" />
        <div className="shell contact-inner">
          <span className="contact-kicker">TEM UMA IDEIA OU OPORTUNIDADE?</span>
          <h2>Vamos construir algo<br /><em>incrível juntos.</em></h2>
          <p>Estou sempre aberto a boas conversas, projetos interessantes e novos desafios.</p>
          <ContactLinks />
        </div>
      </section>);
}
