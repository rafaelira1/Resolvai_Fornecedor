# resolvAI

## Estrutura visual e de código

O Fornecedor segue a estrutura de layout e tipografia do Cliente, preservando sua paleta laranja/navy.
Rotas ficam em `src/routes`, páginas em `src/pages/<Nome>/index.jsx`, layouts compartilhados em
`src/components/layout` e estilos em `src/styles`. Fontes WOFF2 e marca SVG são locais em `public/fonts` e `public/brand`.
Tamanhos de fonte, sidebar, espaçamentos e bordas são compartilhados em `src/styles/variables.css`.
Detalhes, exemplos de variáveis, referência e roteiro de conferência manual: [guia visual](docs/STYLE_GUIDE.md).

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

## Ativar Fornecedor com uma conta do Cliente

Use o mesmo e-mail e senha do Cliente no login do Fornecedor. Uma conta sem perfil
profissional recebe `providerProfileStatus: pending` e segue para
`/ativar-fornecedor`, com o formulário "Ativar perfil de fornecedor".
Nome, e-mail e CPF existentes são reaproveitados; e-mail, senha, UUID e papel
não são enviados na ativação. O nome pessoal do Cliente é preservado.
Preencha telefone, identificação PF/PJ, nome profissional, cidade/UF e especialidades;
revise e confirme. CPF existente não pode ser substituído; PJ preserva o CPF
pessoal e acrescenta o CNPJ do perfil profissional.

O formulário reutiliza as etapas e validações do cadastro. Ele chama
`POST /api/v1/fornecedores/me/complete-registration` com o Bearer da conta
existente. Após confirmar o perfil, atualiza a sessão para status `active`
e abre o painel. Uma resposta perdida pode ser conferida por uma leitura do próprio
perfil, sem repetir automaticamente a gravação. Os campos permanecem no formulário
em caso de falha. Senhas não são solicitadas nem armazenadas nesse fluxo.

A conta permanece com o mesmo ID e papel original; o backend valida a capacidade
profissional a cada requisição usando o perfil no banco. O status salvo no navegador
não concede permissões por si só. Pedidos próprios não recebem propostas da mesma conta.

Antes de testar, execute a nova versão do backend, reinicie o frontend, saia da
sessão antiga e entre com uma conta Cliente. Conclua a ativação, confira o painel
e volte ao Cliente para verificar seus pedidos. Na publicação, atualize o backend
antes do frontend: a renovação profissional usa `/api/v1/auth/refresh-provider`.
Não há script SQL novo, dependência ou configuração adicional para essa mudança.

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
   `POST /api/v1/auth/refresh-provider` e `GET/PATCH /api/v1/fornecedores/me`.
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
O acesso às telas profissionais exige conta ativa e perfil profissional confirmado pela API, incluindo contas Cliente após a ativação.
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
fictícios na tela de perfil. Pedidos, propostas, oportunidades e indicadores da
Home usam a API, conforme descrito abaixo.

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
nesse recurso preserva a sessão profissional.

As duas rotas usam a mesma configuração `VITE_API_BASE_URL` do cadastro/perfil.
Não há novas chaves, migrações ou configurações do Supabase no frontend.

## Fluxo de pedidos integrado à API

- `/pedidos`: pedidos cuja proposta do fornecedor autenticado foi escolhida.
- `/pedidos/detalhes?id=<UUID>`: detalhe real do pedido e da proposta aceita.
- `/home`: resumo, oportunidades recentes e até cinco pedidos ativos; o link “Ver todos” abre a lista completa.

A lista usa `GET /api/v1/provider/proposals?status=chosen&page=...&pageSize=50`,
percorrendo todas as páginas. Os detalhes são consultados em
`GET /api/v1/provider/orders/{id}`, com no máximo quatro consultas simultâneas.
A API restringe a leitura ao fornecedor autenticado; o frontend confirma que a
proposta retornada foi escolhida antes de exibir o pedido como serviço.
Propostas apenas enviadas/visualizadas e pedidos de outros prestadores não entram
em “Meus Pedidos”. Um pedido sem proposta escolhida permanece em Oportunidades.

`Pending` com proposta escolhida aparece como “Proposta aceita”; `InProgress`,
`Completed` e `Cancelled` aparecem como “Em andamento”, “Concluído” e “Cancelado”.
O aceite não comprova pagamento nem início da execução. Valores, cliente, local,
prazo e garantia vêm da API; datas de conclusão, notas e progresso percentual
não são estimados quando o backend não os fornece.

A Home consulta `GET /api/v1/provider/summary` e as oportunidades existentes em
`GET /api/v1/fornecedores/me/oportunidades?pageSize=4&sort=recent`.
Indicadores exibem pedidos ativos, serviços concluídos, propostas ativas e pedidos
compatíveis; não há ganhos, avaliações ou percentuais fictícios.
Cada seção distingue carregamento, erro com nova tentativa e resultado vazio.
Consultas recentes são reutilizadas por 5 minutos entre as telas. Depois disso,
a navegação ou o retorno à aba revalida em segundo plano, mantendo os dados já
confirmados visíveis durante a consulta. A atualização manual sempre força nova
leitura. Trocas de conta/perfil ou saída da tela cancelam leituras anteriores.

Não há fallback para pedidos de exemplo nem status em `localStorage`.
As telas integradas são de consulta: chat, contrato assinado, fotos de execução,
pagamento e solicitação de conclusão dependem de integrações próprias e não são
simulados nos pedidos reais. Nenhuma migração ou chave do Supabase é necessária
no frontend; a API usa a configuração de origem existente.

Para validar com a API publicada:
1. Configure `VITE_API_BASE_URL` e entre como fornecedor.
2. Confira que, sem propostas escolhidas, “Meus Pedidos” está vazio.
3. Aceite uma proposta pelo fluxo do cliente e atualize as duas telas: o pedido
   deve aparecer com seu UUID, valor e status reais.
4. Confira os detalhes pelo link e os estados concluído/cancelado com dados do banco.
5. Entre como outro fornecedor e confirme que os pedidos anteriores não aparecem.
6. Interrompa a API: deve aparecer erro e opção de tentar novamente, sem exemplos.

Validações: `npm run build`, `npm run lint` e `npm test`.

## Navegação e tempo de carregamento

Links internos usam o histórico do navegador, sem recarregar toda a aplicação.
Isso preserva a verificação da conta enquanto se navega entre telas protegidas;
recarregar a página continua verificando o perfil na API. Voltar/avançar, links
com UUID na query, abertura em outra aba, downloads e links externos mantêm seus
comportamentos. A recuperação de senha por fragmento continua funcionando.

Home, Meus Pedidos, detalhes do serviço, feed e detalhes de oportunidades,
formulário de proposta e catálogo do perfil compartilham respostas de consulta.
O cache fica em memória e no `sessionStorage` da aba, na chave
`resolvai:provider-data:v1`, com validade de 5 minutos por sessão e filtros profissionais.
Resultados anteriores podem ser usados por até 30 minutos enquanto a API é
consultada novamente em segundo plano. O primeiro acesso a dados ainda não vistos
continua precisando da API; o cache não cria registros de exemplo.
O foco da janela não reinicia consultas em andamento nem repete consultas recentes.
Erros não são guardados como resultados bem-sucedidos. Logout, troca de conta ou
mudança de cidade/especialidades limpa o cache; o envio confirmado de proposta
também invalida os dados para que a próxima tela faça uma nova leitura.
Recarregar o navegador preserva os resultados de consulta da mesma sessão, mas
o perfil continua sendo confirmado pela API antes de abrir as telas protegidas.
Senhas, tokens e respostas de autenticação não entram no cache de dados.
Os formatos salvos são validados ao restaurar; dados expirados ou inválidos são
ignorados. Se o navegador bloquear o armazenamento, o cache em memória continua
funcionando. Ao fechar a aba, o armazenamento de sessão é descartado pelo navegador.

Testes de navegação verificam que Home → Meus Pedidos → Home consulta perfil,
pedidos, resumo e oportunidades uma única vez enquanto os dados estão recentes,
além da troca de UUID, atualização manual, recarregamento do navegador,
reutilização de detalhes/perfil e isolamento entre sessões.
O primeiro acesso e consultas após a validade ainda dependem da latência da API
e do banco; esta otimização reduz recarregamentos e consultas repetidas.

### Filtros e detalhes sem consultas repetidas

Quando uma resposta recente, sem busca/filtro e em ordem de publicação contém
**todos** os pedidos disponíveis (`items.length === totalItems`, página 1), os
filtros de categoria, busca literal, ordenação e paginação são calculados sobre
esse conjunto já autorizado. A idade do resultado continua sendo a da consulta
original. Uma página parcial nunca é tratada como a lista inteira: nesse caso,
um filtro novo consulta a API normalmente. As regras de normalização e desempate
seguem o servidor, incluindo a ordem original de registros com a mesma data.

Os links de detalhes em Home/Oportunidades iniciam a leitura ao receber foco,
mouse ou toque, com no máximo duas preparações simultâneas. Se o usuário clicar
antes da resposta, a tela compartilha a mesma requisição em vez de reiniciá-la.
Consultas simultâneas da mesma sessão/chave também são compartilhadas. Cancelar
um consumidor não cancela os demais; sair da conta cancela todos.

Atualizar força somente aquela tentativa. Voltar depois a um filtro já consultado
reaproveita o cache, inclusive após atualização manual. Erros recuperáveis de
revalidação preservam o conteúdo anterior com aviso; 401/403/404 ocultam os dados
do recurso e removem o resultado indisponível do cache. Erros nunca são salvos
como resultados vazios. A autenticação e a autorização de envio continuam na API.

O backend também precisa conter a otimização de consultas de oportunidades:
listagem e detalhe passam de cinco comandos SQL sequenciais para um SELECT cada
(sem contar as verificações de autenticação/perfil). Em comparação somente de
leitura no mesmo banco e conexão, quatro execuções aquecidas mediram médias de
836 → 168 ms na listagem e 874 → 171 ms no detalhe. Esses números medem o
repositório, não o tempo total de navegação, e variam com a rede e o volume de dados.

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
