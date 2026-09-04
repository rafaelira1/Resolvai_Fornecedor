import BrandMark from './BrandMark'
import { WrenchIcon } from './Icons'

function ProviderIdentity({ mobile = false }) {
  return (
    <div
      className={mobile ? 'mobile-brand' : 'brand-content'}
      aria-label="ResolvAI, área do fornecedor"
    >
      <BrandMark />
      <div className="brand-name">
        Resolv<span>AI</span>
      </div>

      {!mobile && (
        <p className="brand-tagline">
          Conectando quem resolve<br />ao trabalho certo.
        </p>
      )}

      <div className="provider-badge">
        <WrenchIcon />
        Área do fornecedor
      </div>
    </div>
  )
}

export default ProviderIdentity
