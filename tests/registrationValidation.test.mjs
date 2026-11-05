import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createRegistrationPayload,
  formatDocument,
  formatPhone,
  validateRegistration,
} from '../src/services/registrationValidation.js'

const testCpf = ['111', '444', '777', '35'].join('')
const testCnpj = ['12', 'ABC', '345', '01', 'DE', '35'].join('')
const availableSpecialties = ['hidraulica', 'eletrica']

function form(overrides = {}) {
  return {
    name: ' Conta de teste ',
    email: ' PRESTADOR@example.invalid ',
    password: '  senha-sintetica-de-teste  ',
    passwordConfirmation: '  senha-sintetica-de-teste  ',
    tipoPessoa: 'PF',
    nomeExibicao: ' Perfil de teste ',
    cpf: testCpf,
    cnpj: '',
    telefone: '0'.repeat(11),
    cidadeAtuacao: ' Cidade de teste ',
    ufAtuacao: 'ce',
    raioAtendimentoKm: '',
    bio: ' ',
    registroProfissional: '',
    especialidades: ['hidraulica'],
    ...overrides,
  }
}

test('PF payload follows the backend contract and preserves password bytes without confirmation or role fields', () => {
  const values = form({ role: 'Admin', isActive: true, identityFile: 'unused' })
  assert.deepEqual(validateRegistration(values, { availableSpecialties }), {})
  const payload = createRegistrationPayload(values)
  assert.equal(payload.name, 'Conta de teste')
  assert.equal(payload.email, 'prestador@example.invalid')
  assert.ok(payload.password === values.password)
  assert.ok(payload.cpf === testCpf)
  assert.ok(payload.cnpj === null)
  assert.equal(payload.ufAtuacao, 'CE')
  assert.equal(payload.raioAtendimentoKm, 20)
  assert.equal(payload.bio, null)
  assert.equal(payload.registroProfissional, null)
  assert.deepEqual(Object.keys(payload).sort(), [
    'name', 'email', 'password', 'tipoPessoa', 'nomeExibicao', 'cpf', 'cnpj', 'telefone',
    'cidadeAtuacao', 'ufAtuacao', 'raioAtendimentoKm', 'bio', 'registroProfissional', 'especialidades',
  ].sort())
})

test('PJ accepts the alphanumeric CNPJ mask without losing letters and sends no CPF', () => {
  const masked = formatDocument(testCnpj.toLowerCase(), 'PJ')
  assert.ok(/[A-Z]/.test(masked))
  const values = form({ tipoPessoa: 'PJ', cpf: ' ', cnpj: masked })
  assert.deepEqual(validateRegistration(values, { availableSpecialties }), {})
  const payload = createRegistrationPayload(values)
  assert.ok(payload.cpf === null)
  assert.ok(payload.cnpj === testCnpj)
})

test('CPF mask is accepted while mathematical errors and incompatible documents are rejected', () => {
  const valid = form({ cpf: formatDocument(testCpf, 'PF') })
  assert.deepEqual(validateRegistration(valid, { availableSpecialties }), {})
  assert.ok(createRegistrationPayload(valid).cpf === testCpf)

  for (const invalid of [
    form({ cpf: '' }),
    form({ cpf: testCpf.slice(0, -1) + '0' }),
    form({ cpf: '0'.repeat(11) }),
    form({ cpf: 'x' + testCpf }),
    form({ cpf: '\u0661' + testCpf.slice(1) }),
    form({ cnpj: testCnpj }),
    form({ tipoPessoa: 'PJ', cpf: testCpf, cnpj: testCnpj }),
    form({ tipoPessoa: 'PJ', cpf: '', cnpj: testCnpj.slice(0, -1) + '0' }),
  ]) {
    const errors = validateRegistration(invalid)
    assert.ok(errors.cpf || errors.cnpj)
    assert.throws(() => createRegistrationPayload(invalid))
  }
})

test('phone formatting supports ten and eleven digits and payloads contain only digits', () => {
  for (const size of [10, 11]) {
    const digits = '0'.repeat(size)
    const masked = formatPhone(digits)
    assert.ok(size === 10 ? /^\([0-9]{2}\) [0-9]{4}-[0-9]{4}$/.test(masked)
      : /^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$/.test(masked))
    const values = form({ telefone: masked })
    assert.deepEqual(validateRegistration(values), {})
    assert.ok(createRegistrationPayload(values).telefone === digits)
  }
  for (const telefone of ['0'.repeat(9), 'x' + '0'.repeat(10), '\t' + '0'.repeat(10), '\u0661' + '0'.repeat(9)]) {
    assert.ok(validateRegistration(form({ telefone })).telefone)
  }
})

test('validation uses the current step during navigation and all fields before submitting', () => {
  const values = form({ name: '', especialidades: [] })
  const firstStep = validateRegistration(values, { step: 0, availableSpecialties })
  assert.ok(firstStep.name)
  assert.equal(firstStep.especialidades, undefined)
  const secondStep = validateRegistration(values, { step: 1, availableSpecialties })
  assert.ok(secondStep.especialidades)
  assert.equal(secondStep.name, undefined)
  const complete = validateRegistration(values, { availableSpecialties })
  assert.ok(complete.name && complete.especialidades)
  assert.throws(() => createRegistrationPayload(values))
})

test('password confirmation, required text and DTO limits stop invalid payloads', () => {
  const invalidFields = [
    ['password', form({ password: 'short', passwordConfirmation: 'short' })],
    ['password', form({ password: 'x'.repeat(129), passwordConfirmation: 'x'.repeat(129) })],
    ['passwordConfirmation', form({ passwordConfirmation: 'different-test-value' })],
    ['email', form({ email: 'invalid-email' })],
    ['email', form({ email: '\tprestador@example.invalid' })],
    ['name', form({ name: 'x'.repeat(201) })],
    ['nomeExibicao', form({ nomeExibicao: ' ' })],
    ['cidadeAtuacao', form({ cidadeAtuacao: 'x'.repeat(121) })],
    ['ufAtuacao', form({ ufAtuacao: 'ZZ' })],
    ['bio', form({ bio: 'x'.repeat(361) })],
    ['registroProfissional', form({ registroProfissional: 'x'.repeat(81) })],
  ]
  for (const [field, values] of invalidFields) {
    assert.ok(validateRegistration(values)[field], `Expected a validation error for ${field}`)
    assert.throws(() => createRegistrationPayload(values))
  }
})

test('radius defaults only when blank and rejects out-of-range, fractional or malformed values', () => {
  for (const radius of [0, -1, 201, 1.5, '20abc', 'Infinity']) {
    assert.ok(validateRegistration(form({ raioAtendimentoKm: radius })).raioAtendimentoKm)
  }
  for (const radius of [1, '200']) {
    const values = form({ raioAtendimentoKm: radius })
    assert.deepEqual(validateRegistration(values), {})
    assert.equal(createRegistrationPayload(values).raioAtendimentoKm, Number(radius))
  }
})

test('specialties are required and must belong to the active catalog', () => {
  for (const especialidades of [[], [''], ['not_in_the_catalog']]) {
    assert.ok(validateRegistration(form({ especialidades }), { availableSpecialties }).especialidades)
  }
  assert.ok(validateRegistration(form(), { availableSpecialties: [] }).especialidades)
  const values = form({ especialidades: ['eletrica', 'hidraulica', 'eletrica'] })
  assert.deepEqual(validateRegistration(values, { availableSpecialties }), {})
  assert.deepEqual(createRegistrationPayload(values).especialidades, ['eletrica', 'hidraulica'])
})
