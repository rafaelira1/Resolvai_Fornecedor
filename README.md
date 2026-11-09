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

## Consulta de CEP no cadastro

Na etapa 2, o campo opcional CEP consulta `https://viacep.com.br/ws/{cep}/json/`
ao completar 8 digitos e preenche cidade de atuacao e UF. Os campos continuam
editaveis. A consulta tem limite de 8 segundos; se o CEP nao existir ou o servico
falhar, a interface orienta o preenchimento manual. Consultas anteriores sao
canceladas ao trocar o CEP, editar cidade/UF ou sair da etapa.

O CEP serve apenas para facilitar o preenchimento: o contrato atual da API
continua recebendo `cidadeAtuacao` e `ufAtuacao`, sem armazenar o CEP. O ViaCEP
e consultado diretamente pelo navegador, sem chaves ou configuracao adicional.

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
propostas e métricas da Home permanecem sem nova integração. O painel de
oportunidades usa os pedidos reais, conforme descrito abaixo.

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

## Oportunidades reais

`/oportunidades` consulta `GET /api/v1/fornecedores/me/oportunidades` usando a
sessão profissional. A API lista pedidos abertos cuja categoria corresponde
ao código ou ao nome de uma especialidade ativa cadastrada do fornecedor.
Não há filtro de cidade ou raio. Pedidos já atribuídos, em andamento,
concluídos ou cancelados ficam fora do feed.

Busca, filtro por especialidade, ordenação por data/quantidade de propostas e
paginação são aplicados no servidor. Todas as páginas podem ser consultadas.
O botão Atualizar consulta novamente o banco. Carregamento, erro e ausência de
pedidos têm estados distintos; não há fallback para pedidos de demonstração.
Os números exibidos vêm da API. Estimativas financeiras e percentuais de IA
fictícios foram removidos do painel.

`/oportunidades/detalhes?id=<uuid>` consulta o detalhe real com a mesma regra de
especialidade e disponibilidade. Fotos e informações do pedido vêm do banco;
o layout segue a referência em duas colunas, sem o painel de compatibilidade
por IA. O cartão do cliente exibe nome, data de cadastro e contadores reais de
pedidos; a galeria permite ampliar as fotos. A ação de esclarecimento foi
removida. Os botões Enviar Proposta abrem
`/oportunidades/proposta?id=<uuid>` para preencher a proposta do pedido real.

O formulário de proposta contém valores, prazo, início disponível, descrição,
materiais, garantia obrigatória e até 5 fotos JPG/PNG de até 5 MB. A prévia usa
a identidade profissional atual e simula o valor líquido com taxa ilustrativa
de 10%, sem definir condições comerciais reais. Fotos têm prévia local e podem
ser removidas; URLs temporárias são liberadas ao sair da tela. Não há dicas de
IA, fotos fictícias nem dados de um prestador de demonstração.

O envio real usa `POST /api/v1/fornecedores/me/oportunidades/{id}/propostas`,
com JSON do formulário e arquivos em multipart. A API salva os campos na tabela
de propostas e as fotos no Storage. O prestador é identificado pelo Bearer.
A tela só mostra sucesso após uma resposta 201 confirmada. Cliques repetidos
compartilham a mesma tentativa; em falha de resultado incerto, os campos ficam
bloqueados e “Verificar envio” reutiliza o UUID para não duplicar a proposta.
A simulação de taxa não altera o valor total salvo no banco.
Um pedido indisponível retorna aviso, sem selecionar outro registro. Um 404
nesse recurso preserva a sessão profissional. O envio de propostas não faz
parte desta integração. As rotas existentes `/pedidos` continuam demonstrativas.

As duas rotas usam a mesma configuração `VITE_API_BASE_URL` do cadastro/perfil.
Não há novas chaves, migrações ou configurações do Supabase no frontend.

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

O fluxo do fornecedor usa link por e-mail:

1. A tela envia `POST /api/v1/auth/forgot-password` com `{email, redirectTo}`.
   O campo `redirectTo` aponta para `/redefinir-senha` na origem do frontend.
   A resposta não informa se a conta existe.
2. Ao abrir o link, o frontend captura a sessão de recuperação, remove os tokens
   da URL e mantém o acesso somente em memória.
3. O usuário informa e confirma a nova senha. A tela envia
   `POST /api/v1/auth/change-password` com `{newPassword}` e o Bearer da recuperação.
4. Depois da confirmação do servidor, a tela descarta a sessão de recuperação e
   oferece o retorno ao login. Links inválidos ou expirados exigem um novo link.

A origem da API usa `VITE_API_BASE_URL`, com fallback para `VITE_API_URL`, como
nas demais integrações. `VITE_PASSWORD_RECOVERY_URL` não é utilizada.
Configure a origem do frontend em `CORS_ALLOWED_ORIGINS` no backend, autorize
a URL de retorno no Supabase Auth e configure o e-mail com o link de recuperação.
Entrega real e retorno pelo link precisam ser validados no ambiente de publicação.

`/api/v1/auth/reset-password` fica reservado ao fluxo alternativo por código OTP,
com `{email, token, newPassword}`. A interface do fornecedor utiliza o fluxo por link.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
