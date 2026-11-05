import { ApiError, requestJson } from './api.js'

const categoryIcons = {
  hidraulica: 'wrench',
  eletrica: 'bolt',
  impermeabilizacao: 'drop',
  pintura: 'paint',
  alvenaria: 'bricks',
  serralheria: 'tools',
}

export async function getServiceCategories({ signal, apiUrl, fetchImpl } = {}) {
  const categories = await requestJson('/api/v1/especialidades', { signal, apiUrl, fetchImpl })
  if (!Array.isArray(categories)
    || categories.some((category) => !category || typeof category.codigo !== 'string' || !category.codigo.trim()
      || typeof category.nome !== 'string' || !category.nome.trim())
    || new Set(categories.map((category) => category.codigo.trim())).size !== categories.length) {
    throw new ApiError('O serviço retornou um catálogo inválido. Tente novamente.', { status: 200 })
  }

  return categories.map((category) => ({
    id: category.codigo.trim(),
    name: category.nome.trim(),
    icon: Object.hasOwn(categoryIcons, category.codigo.trim()) ? categoryIcons[category.codigo.trim()] : 'tools',
  }))
}
