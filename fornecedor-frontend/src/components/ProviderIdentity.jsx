import { BrandWordmark } from './BrandLogo'
import { WrenchIcon } from './Icons'

function ProviderIdentity({ mobile = false }) {
  return (
    <div
      className={mobile ? 'mobile-brand' : 'brand-content'}
      aria-label="ResolvAI, área do fornecedor"
    >
      <BrandWordmark className="provider-wordmark" />

      <div className="provider-badge">
        <WrenchIcon />
        Área do fornecedor
      </div>
    </div>
  )
}

export default ProviderIdentity
