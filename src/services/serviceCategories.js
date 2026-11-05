const TEST_CATEGORIES = [
  { id: 'hidraulica', name: 'Hidráulica', icon: 'wrench' },
  { id: 'eletrica', name: 'Elétrica', icon: 'bolt' },
  { id: 'impermeabilizacao', name: 'Impermeabilização', icon: 'drop' },
  { id: 'pintura', name: 'Pintura', icon: 'paint' },
  { id: 'alvenaria', name: 'Alvenaria', icon: 'bricks' },
  { id: 'serralheria', name: 'Serralheria', icon: 'tools' },
]

// Substituir o retorno abaixo pela chamada ao endpoint do backend quando estiver disponível.
export async function getServiceCategories() {
  return TEST_CATEGORIES
}
