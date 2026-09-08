import imagotipo from '../assets/branding/imagotipo-resolvai.png'
import logotipo from '../assets/branding/logotipo-resolvai.png'

export function BrandWordmark({ className = '' }) {
  return (
    <img
      className={`brand-wordmark ${className}`.trim()}
      src={logotipo}
      alt="ResolvAI — Conectando quem precisa a quem resolve"
    />
  )
}

export function BrandLockup({ className = '' }) {
  return (
    <img
      className={`brand-lockup ${className}`.trim()}
      src={imagotipo}
      alt="ResolvAI — Conectando quem precisa a quem resolve"
    />
  )
}
