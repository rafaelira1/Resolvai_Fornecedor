# resolvAI

## Executar o frontend

O projeto React + Vite fica diretamente na raiz de `Resolvai_Fornecedor`.
Execute os comandos abaixo nessa pasta:

```sh
npm install
npm run dev
```

No PowerShell, se a politica de execucao bloquear `npm.ps1`, use `npm.cmd`
no lugar de `npm`.

Para gerar a versao de producao, execute `npm run build`.
Para verificar o codigo, execute `npm run lint`.

## Documentacao original do template

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Documentação de cadastro recebida da dev

# React + Vite

## Cadastro de prestadores

As rotas `/cadastro` e `/criar-conta` cadastram um Prestador PF ou PJ pela API do
ResolvAI. O formulário tem três etapas: dados básicos e acesso, perfil profissional
e atendimento, e revisão dos dados. Não exige RG/CNH, portfólio ou aprovação manual.

### Configuração local

1. Copie `.env.example` para `.env.local`. `VITE_API_BASE_URL` é a origem pública
   da API, sem `/api/v1` e sem credenciais. Vazio usa as rotas `/api/v1/...` na
   mesma origem; o Vite encaminha `/api` para `http://127.0.0.1:5172`.
   `VITE_API_URL` continua como fallback somente quando a variável canônica não existe.
2. Inicie uma versão do backend que contenha `GET /api/v1/especialidades` e
   `POST /api/v1/auth/register-provider`, `POST /api/v1/auth/login-provider`,
   `POST /api/v1/auth/refresh` e `GET/PATCH /api/v1/fornecedores/me`.
3. No ambiente do backend, configure `Cors:AllowedOrigins` com a origem efetiva
   do frontend. Ela costuma ser `http://localhost:5173`, mas deve corresponder à
   porta e ao protocolo exibidos pelo Vite.
4. Reinicie o Vite depois de alterar as variáveis de ambiente.

O catálogo de especialidades vem do backend; falhas ou catálogo vazio não são
substituídos por dados de demonstração. Os códigos selecionados são enviados no
cadastro junto aos dados da conta, identificação, perfil e atendimento.

PF informa CPF e envia CNPJ nulo. PJ informa CNPJ e envia CPF nulo. O formulário
aceita o CNPJ alfanumérico suportado pelo backend. O raio padrão é de 20 km,
entre 1 e 200 km; bio e registro profissional são opcionais. A confirmação de
senha é validada somente na interface e não integra o JSON enviado à API.

O cadastro só exibe sucesso após uma resposta `201` válida. Em erro, os campos
são preservados para correção e não há repetição automática do POST. Uma falha
de rede, tempo esgotado ou resposta `503` pode deixar a conclusão incerta: a conta
externa pode ter sido iniciada mesmo sem uma resposta completa. A tentativa não
deve ser repetida automaticamente nem com credenciais diferentes para contornar
esse estado. A senha e o formulário não são gravados em `localStorage` ou logs.

Após o sucesso, a tela oferece retorno à entrada. O cadastro não cria sessão
automática. O login usa a rota profissional e confirma o perfil antes de entrar.
O acesso às telas profissionais exige Prestador ativo e perfil confirmado pela API.
Tokens expirados são renovados por uma única solicitação compartilhada; um 401
permite apenas uma renovação e uma repetição, sem loops. Recusas de autenticação
ou autorização retiram a sessão da área profissional.

Sem “Lembrar meu acesso”, a sessão fica em `sessionStorage`; com a opção, fica em
`localStorage`. Somente tokens, validade e dados básicos da conta são persistidos
na chave `resolvai:provider-session:v1`; senhas e respostas completas do perfil
não são armazenadas. Sair remove apenas essa chave de ambos os armazenamentos,
preservando pedidos e rascunhos existentes. Após recarregar, a identidade profissional
é consultada novamente, incluindo alterações salvas no perfil.

O perfil usa GET/PATCH reais e exibe sucesso somente após a resposta confirmada.
Nome da conta, nome profissional, telefone, cidade, UF, raio, bio, registro e
especialidades são editáveis. E-mail, tipo e CPF/CNPJ são somente leitura. Campos
opcionais podem ser limpos. Não há portfólio, métricas ou selo de verificação
fictícios na tela de perfil. Os fluxos demonstrativos existentes de pedidos,
oportunidades, propostas e métricas da Home permanecem sem nova integração.

### Hospedagem e verificação

Configure `VITE_API_BASE_URL` no ambiente que gera o build, apontando para a API
publicada com HTTPS. Depois de mudar esse valor, gere e publique o frontend
novamente. A hospedagem também deve servir a aplicação ao acessar diretamente
rotas como `/cadastro` e `/login`. Variáveis `VITE_*` são públicas; credenciais
do banco e chaves privadas do Supabase pertencem ao ambiente do backend. Se a base
ficar vazia em produção, a hospedagem precisa encaminhar `/api` para o backend;
o proxy do Vite serve somente ao desenvolvimento.

Execute `npm test`, `npm run lint` e `npm run build` antes do PR. Os testes de
cadastro, catálogo, sessão e perfil usam HTTP simulado, e os testes de pedidos existentes devem
continuar passando. Essa cobertura não confirma integração com um banco real.
Validações de escrita devem ocorrer em ambiente isolado; testes automatizados
não devem apontar para o Supabase de produção. Não reaplique scripts SQL para
testar o frontend. Qualquer operação de produção requer autorização específica.

## Fluxo de pedidos

- `/pedidos`: serviços aceitos, em andamento, aguardando confirmação e concluídos.
- `/pedidos/detalhes?id=1`: progresso, fotos, resumo do contrato e conclusão da execução.
- A Home e o menu lateral levam aos mesmos pedidos; em telas pequenas o fluxo usa navegação inferior.

Os três pedidos iniciais são dados de demonstração em `src/data/orders.js`.
Marcar um serviço como concluído exige confirmação e muda seu estado para
`awaiting_confirmation`. Essa ação não libera pagamento nem conclui a etapa do cliente.
O estado fica no `localStorage` (`resolvai:orders:v1`), assim como os rascunhos de chat.
As fotos ficam no IndexedDB (`resolvai-order-photos`): até 8 imagens JPG/PNG/WebP,
de até 5 MB cada, por pedido, com prévia e remoção. Os dados são locais à origem
e ao navegador e não são enviados a um servidor.

O chat permite salvar rascunhos; o contrato apresenta um resumo demonstrativo.
Envio de mensagens, contrato assinado, confirmação do cliente e pagamento dependem
de integrações de backend ainda não presentes neste repositório.

Validações: `npm run build`, `npm run lint` e `npm test`.

## Recuperação de senha

A tela está disponível em `/#recuperar-senha`, `/login#recuperar-senha` e `/recuperar-senha`.

Para habilitar o envio real, copie `.env.example` para `.env.local`, configure
`VITE_PASSWORD_RECOVERY_URL` com o endpoint do serviço de autenticação e reinicie o Vite.
O frontend envia `POST` com JSON `{ "email": "..." }`. O endpoint deve retornar
um status 2xx (sem HTML) quando aceitar a solicitação, com a mesma resposta para
e-mails cadastrados e não cadastrados, e 429 para excesso de solicitações.
Se estiver em outra origem, o backend precisa permitir a origem do frontend via CORS.
Essa variável é pública: não inclua chaves ou segredos.

O backend deve gerar e validar tokens de uso único com expiração, enviar o e-mail
e realizar a troca da senha. Esse serviço ainda não existe neste repositório.
Sem o endpoint configurado, a tela exibe indisponibilidade e não simula envio.
Não aponte essa variável para `/api/v1/auth/reset-password`, que exige uma sessão
verificada e altera a senha do usuário autenticado. `/api/v1/auth/check-email`
não envia e-mail e também não serve como endpoint de recuperação.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
