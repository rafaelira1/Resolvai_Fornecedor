export const orders = [
  {
    id: '1', title: 'Impermeabilização de Laje', customer: 'Ygor Chagas',
    neighborhood: 'Aldeota', city: 'Fortaleza', value: 1850, deadline: '4 dias úteis',
    startedAt: 'ontem', guarantee: '5 anos', status: 'in_progress',
    scope: 'Preparação da superfície, tratamento dos pontos de infiltração e aplicação do sistema de impermeabilização na laje.',
  },
  {
    id: '2', title: 'Reparo Hidráulico — Cozinha', customer: 'Marcos Freitas',
    neighborhood: 'Meireles', city: 'Fortaleza', value: 980, deadline: '2 dias úteis',
    startedAt: 'hoje', guarantee: '90 dias', status: 'in_progress',
    scope: 'Identificação e reparo do vazamento na cozinha, substituição da tubulação afetada e teste de funcionamento.',
  },
  {
    id: '3', title: 'Pintura Interna — Sala', customer: 'Ana Lima',
    neighborhood: 'Icaraí', city: 'Caucaia', value: 2100, deadline: '3 dias úteis',
    startedAt: 'há 6 dias', completedAt: 'há 3 dias', guarantee: '90 dias',
    status: 'completed', rating: 5,
    scope: 'Proteção de móveis e piso, preparação das paredes, pintura interna da sala e limpeza do ambiente.',
  },
]

export const orderStatuses = {
  in_progress: { label: 'Em andamento', progress: 50 },
  awaiting_confirmation: { label: 'Aguardando confirmação', progress: 75 },
  completed: { label: 'Concluído', progress: 100 },
}

export function formatOrderCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// Only the customer/payment integration can advance an order to "completed".
export function requestOrderCompletion(order, requestedAt = new Date().toISOString()) {
  if (order.status !== 'in_progress') return order
  return { ...order, status: 'awaiting_confirmation', completionRequestedAt: requestedAt }
}

export function restoreOrders(saved) {
  return orders.map((order) => {
    const change = saved?.[order.id]
    if (order.status === 'in_progress' && change?.status === 'awaiting_confirmation'
      && typeof change.completionRequestedAt === 'string'
      && Number.isFinite(Date.parse(change.completionRequestedAt))) {
      return { ...order, status: change.status, completionRequestedAt: change.completionRequestedAt }
    }
    return { ...order }
  })
}
