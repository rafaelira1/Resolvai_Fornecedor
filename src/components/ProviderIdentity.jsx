import { BrandLockup } from './BrandLogo'
import { WrenchIcon } from './Icons'

function ProviderIdentity({ mobile = false, tone = 'dark' }) {
  return (
    <div
      className={mobile ? 'mobile-brand' : 'brand-content'}
      aria-label="ResolvAI, área do fornecedor"
    >
      <BrandLockup className="provider-wordmark" tone={tone} />

      <div className="provider-badge">
        <WrenchIcon />
        Área do fornecedor
      </div>
    </div>
  )
}

export default ProviderIdentity
