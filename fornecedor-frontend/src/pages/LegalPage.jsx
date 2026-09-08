import { useEffect } from 'react'
import BrandMark from '../components/BrandMark'
import { privacySections, termsSections } from '../data/legalContent'

const documents = {
  terms: {
    eyebrow: 'Transparência e confiança',
    title: 'Termos de Uso',
    description: 'As regras para usar a área do fornecedor e oferecer serviços pela ResolvAI.',
    sections: termsSections,
    alternateHref: '/politica-de-privacidade',
    alternateLabel: 'Política de Privacidade',
  },
  privacy: {
    eyebrow: 'Seus dados, suas escolhas',
    title: 'Política de Privacidade',
    description: 'Como a ResolvAI trata e protege os dados de fornecedores em sua plataforma.',
    sections: privacySections,
    alternateHref: '/termos-de-uso',
    alternateLabel: 'Termos de Uso',
  },
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6M9 12h10" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12 6-6 6 6M12 6v13" />
    </svg>
  )
}

function LegalPage({ document: documentType }) {
  const page = documents[documentType]

  useEffect(() => {
    document.title = `${page.title} | ResolvAI`
  }, [page.title])

  return (
    <div className="legal-page" id="topo">
      <header className="legal-topbar">
        <a className="legal-brand" href="/login" aria-label="ResolvAI — voltar ao login">
          <BrandMark />
          <span className="legal-brand-name">Resolv<span>AI</span></span>
          <span className="legal-brand-divider" aria-hidden="true" />
          <span className="legal-brand-area">Área do fornecedor</span>
        </a>
        <a className="back-to-login" href="/login">
          <ArrowLeftIcon />
          Voltar para entrar
        </a>
      </header>

      <section className="legal-hero" aria-labelledby="legal-title">
        <div className="legal-hero-content">
          <div className="legal-icon"><ShieldIcon /></div>
          <p className="legal-eyebrow">{page.eyebrow}</p>
          <h1 id="legal-title">{page.title}</h1>
          <p>{page.description}</p>
          <div className="legal-meta">
            <span>Última atualização</span>
            <strong>8 de setembro de 2026</strong>
            <span className="meta-dot" aria-hidden="true" />
            <span>Versão 1.0</span>
          </div>
        </div>
      </section>

      <main className="legal-layout">
        <aside className="legal-summary" aria-label="Nesta página">
          <p>Nesta página</p>
          <nav>
            {page.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {section.title}
              </a>
            ))}
          </nav>
          <div className="legal-help-card">
            <span>Precisa de ajuda?</span>
            <p>Fale com o suporte pelo canal disponível na plataforma.</p>
          </div>
        </aside>

        <article className="legal-article">
          <div className="legal-notice" role="note">
            <ShieldIcon />
            <p>Este documento explica as práticas da ResolvAI em linguagem clara. Em caso de dúvida, entre em contato antes de continuar usando a plataforma.</p>
          </div>

          {page.sections.map((section, index) => (
            <section id={section.id} className="legal-section" key={section.id}>
              <div className="section-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="section-copy">
                <h2>{section.title}</h2>
                {section.content.map((block, blockIndex) => {
                  if (block.type === 'list') {
                    return <ul key={blockIndex}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
                  }
                  if (block.type === 'callout') {
                    return <div className="section-callout" key={blockIndex}>{block.text}</div>
                  }
                  return <p key={blockIndex}>{block.text}</p>
                })}
              </div>
            </section>
          ))}

          <div className="legal-end-card">
            <div>
              <span>Documento relacionado</span>
              <strong>{page.alternateLabel}</strong>
            </div>
            <a href={page.alternateHref}>Consultar documento <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </main>

      <div className="back-to-top-row">
        <a className="back-to-top" href="#topo" aria-label="Voltar ao topo" title="Voltar ao topo">
          <ArrowUpIcon />
        </a>
      </div>

      <footer className="legal-footer">
        <div className="legal-footer-brand"><span className="footer-mark">R</span><span>ResolvAI</span></div>
        <p>© 2026 ResolvAI. Conectando quem resolve ao trabalho certo.</p>
        <nav aria-label="Documentos legais">
          <a href="/termos-de-uso">Termos de Uso</a>
          <a href="/politica-de-privacidade">Privacidade</a>
        </nav>
      </footer>
    </div>
  )
}

export default LegalPage
