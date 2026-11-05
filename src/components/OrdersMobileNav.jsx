import OrderIcon from './OrderIcon'

function OrdersMobileNav() {
  return (
    <nav className="orders-mobile-nav" aria-label="Navegação mobile">
      <a href="/home"><OrderIcon name="home" />Home</a>
      <a href="/oportunidades"><OrderIcon name="document" />Oportunidades</a>
      <a href="/pedidos" aria-current="page"><OrderIcon name="tool" />Pedidos</a>
      <a href="/meu-perfil"><OrderIcon name="user" />Perfil</a>
    </nav>
  )
}

export default OrdersMobileNav
