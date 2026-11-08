export const opportunities = [
  { id: 1, title: 'Infiltração no banheiro', postedAt: 'há 2 horas', deadline: '5 dias', category: 'Hidráulica', location: 'Itaim Bibi, SP', estimate: 'R$ 1.200–1.800', proposals: 2, compatibility: 92, urgency: 'Alta' },
  { id: 2, title: 'Impermeabilização de laje 120m²', postedAt: 'há 4 horas', deadline: '15 dias', category: 'Impermeabilização', location: 'Pinheiros, SP', estimate: 'R$ 3.500–5.000', proposals: 1, compatibility: 85, urgency: 'Média' },
  { id: 3, title: 'Pintura de sala e quartos', postedAt: 'há 6 horas', deadline: '30 dias', category: 'Pintura', location: 'Vila Madalena, SP', estimate: 'R$ 2.000–2.800', proposals: 3, compatibility: 71, urgency: 'Baixa' },
  { id: 4, title: 'Troca de cano no banheiro', postedAt: 'há 8 horas', deadline: '2 dias', category: 'Hidráulica', location: 'Brooklin, SP', estimate: 'R$ 400–700', proposals: 0, compatibility: 88, urgency: 'Alta' },
  { id: 5, title: 'Reforma de banheiro completo', postedAt: 'há 9 horas', deadline: '45 dias', category: 'Alvenaria', location: 'Aldeota, CE', estimate: 'R$ 8.000–12.000', proposals: 5, compatibility: 55, urgency: 'Baixa' },
  { id: 6, title: 'Reparo de vazamento em cozinha', postedAt: 'há 11 horas', deadline: '3 dias', category: 'Hidráulica', location: 'Moema, SP', estimate: 'R$ 650–950', proposals: 1, compatibility: 90, urgency: 'Alta' },
  { id: 7, title: 'Impermeabilização de cobertura', postedAt: 'há 1 dia', deadline: '20 dias', category: 'Impermeabilização', location: 'Perdizes, SP', estimate: 'R$ 5.500–7.200', proposals: 4, compatibility: 82, urgency: 'Média' },
  { id: 8, title: 'Construção de parede divisória', postedAt: 'há 1 dia', deadline: '12 dias', category: 'Alvenaria', location: 'Tatuapé, SP', estimate: 'R$ 1.800–2.500', proposals: 2, compatibility: 76, urgency: 'Média' },
  { id: 9, title: 'Pintura externa de sobrado', postedAt: 'há 2 dias', deadline: '25 dias', category: 'Pintura', location: 'Santana, SP', estimate: 'R$ 4.200–6.000', proposals: 6, compatibility: 68, urgency: 'Baixa' },
  { id: 10, title: 'Correção de umidade na parede', postedAt: 'há 2 dias', deadline: '7 dias', category: 'Impermeabilização', location: 'Vila Mariana, SP', estimate: 'R$ 1.100–1.600', proposals: 3, compatibility: 87, urgency: 'Alta' },
]

export const opportunityDetails = {
  Hidráulica: {
    problemType: 'Infiltração ativa',
    affectedArea: '~4m² (parede + piso)',
    description: 'Água escorrendo pela parede e sinais de umidade no ambiente. O problema ficou mais intenso nas últimas semanas e precisa de uma avaliação para identificar a origem.',
    services: ['Diagnóstico completo da origem do vazamento', 'Reparo da tubulação afetada', 'Vedação e impermeabilização da área', 'Reparo do reboco danificado pela umidade', 'Pintura de acabamento (a definir)'],
  },
  Impermeabilização: {
    problemType: 'Umidade e infiltração',
    affectedArea: '~120m² de cobertura',
    description: 'A área apresenta pontos de infiltração após chuvas intensas. O cliente busca uma solução completa, com preparação da superfície, impermeabilização e garantia do serviço.',
    services: ['Vistoria e diagnóstico da superfície', 'Preparação e limpeza completa da área', 'Tratamento de trincas e pontos críticos', 'Aplicação do sistema impermeabilizante', 'Teste de estanqueidade e acabamento'],
  },
  Pintura: {
    problemType: 'Pintura interna e acabamento',
    affectedArea: '~65m² de paredes',
    description: 'O imóvel precisa de renovação da pintura, incluindo correções pontuais na parede e acabamento uniforme. O cliente ainda definirá as cores finais com o profissional.',
    services: ['Proteção dos móveis e pisos', 'Correção de furos e pequenas fissuras', 'Preparação e lixamento das paredes', 'Aplicação de selador e tinta', 'Limpeza final do ambiente'],
  },
  Alvenaria: {
    problemType: 'Reforma e adequação',
    affectedArea: '~18m² de intervenção',
    description: 'O cliente deseja executar a reforma com revisão da estrutura existente, novos revestimentos e acabamento. É necessário avaliar o local antes de fechar os materiais.',
    services: ['Visita técnica e levantamento de medidas', 'Remoção dos revestimentos necessários', 'Execução dos serviços de alvenaria', 'Regularização e aplicação de revestimentos', 'Acabamento e limpeza da área'],
  },
}
