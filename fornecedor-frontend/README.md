# React + Vite

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

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
