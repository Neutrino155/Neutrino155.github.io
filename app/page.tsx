/* eslint-disable @next/next/no-img-element -- The portrait and materials visuals are local assets. */

import type { ReactNode } from "react";

import { LoopingVideo } from "./looping-video";

const cvUrl = "/Bradley-Martin-CV.pdf";
const scholarUrl = "https://scholar.google.com/citations?user=EFRyBAUAAAAJ&hl=en";

const profileLinks = [
  { label: "Email", href: "mailto:bradley.martin@ucl.ac.uk" },
  { label: "Google Scholar", href: scholarUrl },
  { label: "ORCID", href: "https://orcid.org/0000-0003-1583-254X" },
  { label: "GitHub", href: "https://github.com/Neutrino155" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/bradley-martin-a723751b6/" },
];

const researchAreas = [
  {
    title: "Field-aware atomistic models",
    text: "Machine-learning interatomic potentials for dielectric and ferroelectric response, where polarization, Born charges, polarizability, and spectra are obtained by differentiating a shared scalar functional.",
  },
  {
    title: "Generative materials design",
    text: "Property-conditioned crystal generation and structure recovery workflows, including CrystaLLM-pi tools for inverse design and diffraction-conditioned prediction.",
  },
  {
    title: "Polarons and path integrals",
    text: "Variational path-integral theory for charge-carrier mobility, electron-phonon coupling, optical conductivity, and high-throughput screening of polar semiconductors.",
  },
];

const software = [
  {
    name: "MACEField",
    kind: "Research software",
    text: "Electric-field-aware MACE models for derivative-consistent polarization, Born effective charges, polarizability, and finite-field molecular dynamics.",
    links: [
      { label: "Repository", href: "https://github.com/mdi-group/mace-field" },
      { label: "Paper", href: "https://arxiv.org/abs/2508.17870" },
    ],
  },
  {
    name: "PolaronMobility.jl",
    kind: "Julia package",
    text: "Variational polaron calculations, DC mobility estimates, and frequency-dependent response for continuum and lattice models.",
    links: [
      { label: "Repository", href: "https://github.com/Frost-group/PolaronMobility.jl" },
      { label: "Paper", href: "https://arxiv.org/abs/2207.06846" },
    ],
  },
  {
    name: "CrystaLLM-pi webapp",
    kind: "Public web tool",
    text: "Browser interface for CrystaLLM-pi generation jobs, including composition input, optional XRD conditioning, structure visualisation, and CIF download.",
    links: [
      { label: "Webapp", href: "https://crystallm-pi.psdi.ac.uk/" },
      {
        label: "Webapp repo",
        href: "https://github.com/Neutrino155/CrystaLLM-pi-webapp",
      },
    ],
  },
  {
    name: "PolaronQMC.jl",
    kind: "Julia code",
    text: "Path-integral quantum Monte Carlo code for polarons, developed alongside broader path-integral work in the Frost group.",
    links: [{ label: "Repository", href: "https://github.com/Frost-group/PolaronQMC.jl" }],
  },
];

const teaching = [
  {
    title: "Diffusion model tutorial",
    text: "Notebook sequence for diffusion fundamentals, crystal diffusion from scratch, and modern crystal-generation workflows.",
    href: "https://github.com/Neutrino155/diffusion-model-tutorial",
  },
  {
    title: "Royce/PSDI CrystaLLM-pi training",
    text: "Workshop material on transformer models for crystal generation, property conditioning, and hands-on CrystaLLM-pi notebooks.",
    href: "https://github.com/mdi-group/royce-psdi-crystallm-training",
  },
  {
    title: "Thesis",
    text: "Path Integral Methods for Polarons in Real Materials, PhD thesis, Imperial College London, Department of Physics, October 2024.",
    href: "/Martin-B-2024-PhD-Thesis.pdf",
  },
];

const publications = [
  {
    title: "General Learning of the Electric Response of Inorganic Materials",
    authors:
      "Bradley A. A. Martin, Alex M. Ganose, Venkat Kapil, Tingwei Li, and Keith T. Butler",
    venue: "PRX Intelligence 1, 013006, 2026",
    note: "MACEField paper: electric enthalpy learning for polarization, Born effective charges, polarizability, and finite-field molecular dynamics.",
    links: [
      { label: "DOI", href: "https://doi.org/10.1103/b116-xy8k" },
      { label: "arXiv", href: "https://arxiv.org/abs/2508.17870" },
      { label: "Code", href: "https://github.com/mdi-group/mace-field" },
    ],
  },
  {
    title: "Discovery and recovery of crystalline materials with property-conditioned transformers",
    authors: "Cyprien Bone, Matthew Walker, Bradley A. A. Martin, et al.",
    venue: "arXiv:2511.21299, revised 2026",
    note: "CrystaLLM-pi property injection for structure recovery, XRD-conditioned generation, and inverse materials design.",
    links: [
      { label: "arXiv", href: "https://arxiv.org/abs/2511.21299" },
      { label: "Webapp", href: "https://crystallm-pi.psdi.ac.uk/" },
    ],
  },
  {
    title: "Six Open Questions in Machine-Learned Interatomic Potential Foundation Models",
    authors: "I. Creed et al., including Bradley A. A. Martin",
    venue: "arXiv:2606.07327, 2026",
    note: "Perspective on definitions, limits, and research directions for foundation models in atomistic simulation.",
    links: [{ label: "arXiv", href: "https://arxiv.org/abs/2606.07327" }],
  },
  {
    title: "Accelerating molecular dynamics by going with the flow",
    authors: "Ahmed Y. Ismail, Bradley A. A. Martin, and Keith T. Butler",
    venue: "Nature Machine Intelligence 7, 1598-1599, 2025",
    note: "News & Views article on generative AI approaches to accelerating molecular dynamics.",
    links: [{ label: "DOI", href: "https://doi.org/10.1038/s42256-025-01129-0" }],
  },
  {
    title: "Predicting polaron mobility in organic semiconductors with the Feynman variational approach",
    authors: "Bradley A. A. Martin and Jarvist Moore Frost",
    venue: "arXiv:2207.06846, revised 2024",
    note: "Variational path-integral treatment of organic-semiconductor polaron mobility.",
    links: [{ label: "arXiv", href: "https://arxiv.org/abs/2207.06846" }],
  },
];

const talks = [
  "Invited talk at CMD32 Austria: Variational Path Integrals for Lattice Polarons, Sep 2026.",
  "Invited talk at Purdue University: MACE-Field, Electric Response of Materials, Jul 2026.",
  "MRS Boston presentation on machine learning for materials response, Dec 2025.",
  "Zagreb Institute Physics invited talk: A Variational Path Integral for Lattice Polarons, Nov 2025.",
  "PSDI Conference invited talk: General Learning of the Electric Response of Inorganic Materials, Jun 2025.",
  "CECAM PI-School invited talk at Tel Aviv University: Extending the FVA for Polarons in Real Materials, Jun 2023.",
];

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

function ExternalLink({
  href,
  children,
  className,
  download,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  download?: boolean;
}) {
  const isLocal = href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:");
  const isHash = href.startsWith("#");
  return (
    <a
      className={className}
      download={download}
      href={href}
      rel={isLocal ? undefined : "noreferrer"}
      target={isLocal || isHash ? undefined : "_blank"}
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header" aria-label="Site header">
        <a className="wordmark" href="#top" aria-label="Bradley Martin home">
          <span className="atom-mark" aria-hidden="true" />
          Bradley Martin
        </a>
        <nav aria-label="Primary navigation">
          <a href="#research">Research</a>
          <a href="#software">Software</a>
          <a href="#teaching">Teaching</a>
          <a href="#publications">Publications</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Materials ML | Atomistic simulation | Polarons</p>
            <h1>Bradley Martin</h1>
            <p className="subtitle">
              Theoretical physicist and materials machine-learning researcher building
              source-aware atomistic models, generative tools for crystal design, and
              path-integral methods for electron-phonon physics.
            </p>
            <div className="hero-actions" aria-label="Hero actions">
              <ExternalLink className="button primary" download href={cvUrl}>
                Download CV PDF
              </ExternalLink>
              <ExternalLink className="button secondary" download href="/Martin-B-2024-PhD-Thesis.pdf">
                Download thesis
              </ExternalLink>
              <ExternalLink className="button ghost" href={scholarUrl}>
                Google Scholar
              </ExternalLink>
            </div>
            <div className="profile-links" aria-label="Profile links">
              {profileLinks.map((link) => (
                <ExternalLink href={link.href} key={link.label}>
                  {link.label}
                </ExternalLink>
              ))}
            </div>
          </div>

          <aside className="portrait-panel" aria-label="Profile summary">
            <div className="portrait-card">
              <img alt="Bradley Martin headshot" src="/headshot-baam.jpg" />
            </div>
          </aside>
        </div>
      </section>

      <section className="band" id="research">
        <div className="content">
          <SectionHeading eyebrow="Research" title="Physics-informed learning for materials response">
            The recurring thread is to make models respect the variables that
            matter physically: applied fields, crystal structure, phonons,
            charge carriers, and the response functions that connect them.
          </SectionHeading>

          <div className="cards three">
            {researchAreas.map((area) => (
              <article className="card" key={area.title}>
                <h3>{area.title}</h3>
                <p>{area.text}</p>
              </article>
            ))}
          </div>

          <div className="visual-pair" aria-label="Materials visualisations">
            <figure>
              <LoopingVideo
                ariaLabel="Animated CsPbCl3 density isosurface visualisation"
                poster="/cspbcl3-density-iso.png"
                preload="metadata"
                src="/cspbcl3-density-iso.mp4"
              />
              <figcaption>Animated charge-density isosurfaces</figcaption>
            </figure>
            <figure>
              <LoopingVideo
                ariaLabel="Animated CsPbCl3 charge and dipole visualisation"
                poster="/cspbcl3-charge-dipoles.png"
                preload="metadata"
                src="/cspbcl3-charge-dipoles.mp4"
              />
              <figcaption>Animated charge and dipole response</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="content cv-download" id="cv">
        <SectionHeading eyebrow="CV" title="Download CV">
          Academic CV available as a PDF.
        </SectionHeading>
        <ExternalLink className="button primary" download href={cvUrl}>
          Download CV PDF
        </ExternalLink>
      </section>

      <section className="band" id="software">
        <div className="content">
          <SectionHeading eyebrow="Software" title="Research software and public tools">
            Research code, public web tools, and teaching repositories are
            collected here for quick access.
          </SectionHeading>

          <div className="cards two">
            {software.map((project) => (
              <article className="card software-card" key={project.name}>
                <p className="card-kicker">{project.kind}</p>
                <h3>{project.name}</h3>
                <p>{project.text}</p>
                <div className="card-actions">
                  {project.links.map((link) => (
                    <ExternalLink href={link.href} key={link.label}>
                      {link.label}
                    </ExternalLink>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content" id="teaching">
        <SectionHeading eyebrow="Teaching" title="Teaching material and thesis">
          Public teaching repositories and thesis material for students and
          collaborators.
        </SectionHeading>

        <div className="cards three">
          {teaching.map((item) => (
            <article className="card teaching-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <ExternalLink download={item.href.endsWith(".pdf")} href={item.href}>
                Open link
              </ExternalLink>
            </article>
          ))}
        </div>
      </section>

      <section className="band publication-band" id="publications">
        <div className="content">
          <div className="section-row">
            <SectionHeading eyebrow="Publications" title="Selected papers and profiles">
              The list highlights recent materials-ML, generative-design, and
              polaron publications, with full records on ORCID and Google Scholar.
            </SectionHeading>
            <div className="mini-actions">
              <ExternalLink className="button secondary" href="https://orcid.org/0000-0003-1583-254X">
                ORCID
              </ExternalLink>
              <ExternalLink className="button secondary" href={scholarUrl}>
                Scholar
              </ExternalLink>
            </div>
          </div>

          <div className="publication-list">
            {publications.map((paper) => (
              <article className="publication" key={paper.title}>
                <div>
                  <h3>{paper.title}</h3>
                  <p className="authors">{paper.authors}</p>
                  <p>{paper.venue}</p>
                  <p className="publication-note">{paper.note}</p>
                </div>
                <div className="publication-links" aria-label={`${paper.title} links`}>
                  {paper.links.map((link) => (
                    <ExternalLink href={link.href} key={link.label}>
                      {link.label}
                    </ExternalLink>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content split-section talks-section">
        <div>
          <SectionHeading eyebrow="Talks" title="Selected presentations" />
          <p className="large-copy">
            Recent and upcoming talks span response-aware machine learning,
            polarons, path integrals, and AI methods for materials simulation.
          </p>
        </div>
        <ul className="highlight-list compact" aria-label="Selected talks">
          {talks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="contact" id="contact">
        <div className="content contact-grid">
          <div>
            <p className="eyebrow">Contact</p>
            <h2>Collaborations, talks, software, and research conversations</h2>
          </div>
          <div className="contact-card">
            <p>
              Especially relevant topics include machine-learning interatomic
              potentials, finite-field simulations, CrystaLLM-pi workflows,
              polarons, electron-phonon physics, and spectroscopy-facing theory.
            </p>
            <div className="contact-actions">
              <ExternalLink className="button primary" href="mailto:bradley.martin@ucl.ac.uk">
                Email Bradley
              </ExternalLink>
              <ExternalLink className="button inverse" href="https://github.com/Neutrino155">
                GitHub
              </ExternalLink>
              <ExternalLink className="button inverse" href="https://www.linkedin.com/in/bradley-martin-a723751b6/">
                LinkedIn
              </ExternalLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
