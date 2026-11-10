export const orderStatuses = {
  accepted: { label: 'Proposta aceita', description: 'Sua proposta foi escolhida. O serviço ainda não está em execução.' },
  in_progress: { label: 'Em andamento', description: 'O serviço está em execução.' },
  completed: { label: 'Concluído', description: 'O pedido foi concluído.' },
  cancelled: { label: 'Cancelado', description: 'O pedido foi cancelado.' },
}

export function formatOrderCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function groupOrders(orders) {
  return {
    active: orders.filter(order => ['accepted', 'in_progress'].includes(order.status)),
    completed: orders.filter(order => order.status === 'completed'),
    cancelled: orders.filter(order => order.status === 'cancelled'),
  }
}
