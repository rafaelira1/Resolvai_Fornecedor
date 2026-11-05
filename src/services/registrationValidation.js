export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

export const BASIC_FIELDS = [
  'name', 'email', 'password', 'passwordConfirmation', 'tipoPessoa', 'cpf', 'cnpj', 'telefone',
]

export const PROFESSIONAL_FIELDS = [
  'nomeExibicao', 'cidadeAtuacao', 'ufAtuacao', 'raioAtendimentoKm',
  'bio', 'registroProfissional', 'especialidades',
]

function isBlank(value) {
  return value == null || (typeof value === 'string' && value.trim() === '')
}

function normalizeCpf(value) {
  return typeof value === 'string' ? value.trim().replace(/[.-]/g, '') : ''
}

function normalizeCnpj(value) {
  return typeof value === 'string' ? value.trim().replace(/[./-]/g, '').toUpperCase() : ''
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value)
  if (!/^[0-9]{11}$/.test(cpf) || new Set(cpf).size === 1) return false

  for (let position = 9; position <= 10; position += 1) {
    let sum = 0
    for (let index = 0; index < position; index += 1) {
      sum += Number(cpf[index]) * (position + 1 - index)
    }
    let digit = (sum * 10) % 11
    if (digit === 10) digit = 0
    if (digit !== Number(cpf[position])) return false
  }

  return true
}

function isValidCnpj(value) {
  const unformatted = typeof value === 'string' ? value.trim().replace(/[./-]/g, '') : ''
  if (!/^[A-Za-z0-9]{12}[0-9]{2}$/.test(unformatted)) return false
  const cnpj = unformatted.toUpperCase()
  if (new Set(cnpj).size === 1) return false

  const weights = [
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  ]

  return weights.every((positions, digitIndex) => {
    const sum = positions.reduce((total, weight, index) => (
      total + (cnpj.charCodeAt(index) - 48) * weight
    ), 0)
    const remainder = sum % 11
    const digit = remainder < 2 ? 0 : 11 - remainder
    return digit === Number(cnpj[12 + digitIndex])
  })
}

function isValidPhone(value) {
  if (typeof value !== 'string' || value.length > 20 || /[^0-9 ()+.-]/.test(value)) return false
  return /^[0-9]{10,11}$/.test(value.replace(/[^0-9]/g, ''))
}

function getRadius(value) {
  if (isBlank(value)) return 20
  if (typeof value === 'number') return value
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value.trim())) return NaN
  return Number(value.trim())
}

function checkRequiredText(errors, field, value, label, maximum) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors[field] = `Informe ${label}.`
  } else if (value.length > maximum) {
    errors[field] = `Use até ${maximum} caracteres para ${label}.`
  }
}

function checkOptionalText(errors, field, value, label, maximum) {
  if (value != null && (typeof value !== 'string' || value.length > maximum)) {
    errors[field] = `Use até ${maximum} caracteres para ${label}.`
  }
}

export function validateRegistration(values, { step, availableSpecialties } = {}) {
  const data = values && typeof values === 'object' ? values : {}
  const errors = {}

  checkRequiredText(errors, 'name', data.name, 'o nome da conta', 200)
  checkRequiredText(errors, 'email', data.email, 'o e-mail', 320)
  if (!errors.email && (Array.from(data.email).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    || !/^[^\s@]+@[^\s@]+$/u.test(data.email.trim()))) {
    errors.email = 'Informe um e-mail válido.'
  }

  if (typeof data.password !== 'string' || data.password.trim() === ''
    || data.password.length < 8 || data.password.length > 128) {
    errors.password = 'A senha deve ter de 8 a 128 caracteres.'
  }
  if (typeof data.passwordConfirmation !== 'string' || data.passwordConfirmation === '') {
    errors.passwordConfirmation = 'Confirme a senha.'
  } else if (data.passwordConfirmation !== data.password) {
    errors.passwordConfirmation = 'As senhas devem ser iguais.'
  }

  if (data.tipoPessoa !== 'PF' && data.tipoPessoa !== 'PJ') {
    errors.tipoPessoa = 'Selecione pessoa física ou pessoa jurídica.'
  } else if (data.tipoPessoa === 'PF') {
    if (typeof data.cpf !== 'string' || data.cpf.length > 14 || !isValidCpf(data.cpf)) {
      errors.cpf = 'Informe um CPF válido.'
    }
    if (!isBlank(data.cnpj)) errors.cnpj = 'Pessoa física não pode informar CNPJ.'
  } else {
    if (typeof data.cnpj !== 'string' || data.cnpj.length > 18 || !isValidCnpj(data.cnpj)) {
      errors.cnpj = 'Informe um CNPJ válido.'
    }
    if (!isBlank(data.cpf)) errors.cpf = 'Pessoa jurídica não pode informar CPF.'
  }

  if (!isValidPhone(data.telefone)) {
    errors.telefone = 'Informe um telefone com DDD e 10 ou 11 dígitos.'
  }

  checkRequiredText(errors, 'nomeExibicao', data.nomeExibicao, 'o nome profissional ou comercial', 200)
  checkRequiredText(errors, 'cidadeAtuacao', data.cidadeAtuacao, 'a cidade de atuação', 120)
  if (typeof data.ufAtuacao !== 'string' || data.ufAtuacao.length !== 2
    || !BRAZILIAN_STATES.includes(data.ufAtuacao.toUpperCase())) {
    errors.ufAtuacao = 'Selecione uma UF válida.'
  }
  const radius = getRadius(data.raioAtendimentoKm)
  if (!Number.isSafeInteger(radius) || radius < 1 || radius > 200) {
    errors.raioAtendimentoKm = 'Informe um raio inteiro entre 1 e 200 km.'
  }
  checkOptionalText(errors, 'bio', data.bio, 'a apresentação profissional', 360)
  checkOptionalText(errors, 'registroProfissional', data.registroProfissional, 'o registro profissional', 80)

  if (!Array.isArray(data.especialidades) || data.especialidades.length === 0) {
    errors.especialidades = 'Selecione pelo menos uma especialidade.'
  } else if (data.especialidades.length > 100
    || data.especialidades.some((code) => typeof code !== 'string' || code.trim() === '' || code.trim().length > 100)) {
    errors.especialidades = 'Selecione até 100 especialidades válidas.'
  } else if (availableSpecialties !== undefined
    && (!Array.isArray(availableSpecialties)
      || data.especialidades.some((code) => !availableSpecialties.includes(code.trim())))) {
    errors.especialidades = 'Há especialidades indisponíveis. Atualize a lista e revise sua seleção.'
  }

  const fields = step === 0 ? BASIC_FIELDS : step === 1 ? PROFESSIONAL_FIELDS : null
  return fields ? Object.fromEntries(Object.entries(errors).filter(([field]) => fields.includes(field))) : errors
}

export function createRegistrationPayload(values) {
  const errors = validateRegistration(values)
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0])

  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    tipoPessoa: values.tipoPessoa,
    nomeExibicao: values.nomeExibicao.trim(),
    cpf: values.tipoPessoa === 'PF' ? normalizeCpf(values.cpf) : null,
    cnpj: values.tipoPessoa === 'PJ' ? normalizeCnpj(values.cnpj) : null,
    telefone: values.telefone.replace(/[^0-9]/g, ''),
    cidadeAtuacao: values.cidadeAtuacao.trim(),
    ufAtuacao: values.ufAtuacao.toUpperCase(),
    raioAtendimentoKm: getRadius(values.raioAtendimentoKm),
    bio: typeof values.bio === 'string' && values.bio.trim() ? values.bio.trim() : null,
    registroProfissional: typeof values.registroProfissional === 'string' && values.registroProfissional.trim()
      ? values.registroProfissional.trim() : null,
    especialidades: [...new Set(values.especialidades.map((code) => code.trim()))].sort(),
  }
}

export function formatPhone(value) {
  const digits = typeof value === 'string' ? value.replace(/[^0-9]/g, '').slice(0, 11) : ''
  if (digits.length <= 2) return digits
  const local = digits.slice(2)
  const groupLength = digits.length === 11 ? 5 : 4
  const prefix = `(${digits.slice(0, 2)}) ${local.slice(0, groupLength)}`
  return local.length > groupLength ? `${prefix}-${local.slice(groupLength)}` : prefix
}

export function formatDocument(value, tipoPessoa) {
  if (typeof value !== 'string') return ''

  if (tipoPessoa === 'PJ') {
    const characters = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 14)
    const cnpj = characters.slice(0, 12) + characters.slice(12).replace(/[^0-9]/g, '')
    return cnpj.slice(0, 2)
      + (cnpj.length > 2 ? `.${cnpj.slice(2, 5)}` : '')
      + (cnpj.length > 5 ? `.${cnpj.slice(5, 8)}` : '')
      + (cnpj.length > 8 ? `/${cnpj.slice(8, 12)}` : '')
      + (cnpj.length > 12 ? `-${cnpj.slice(12)}` : '')
  }

  const cpf = value.replace(/[^0-9]/g, '').slice(0, 11)
  return cpf.slice(0, 3)
    + (cpf.length > 3 ? `.${cpf.slice(3, 6)}` : '')
    + (cpf.length > 6 ? `.${cpf.slice(6, 9)}` : '')
    + (cpf.length > 9 ? `-${cpf.slice(9)}` : '')
}
