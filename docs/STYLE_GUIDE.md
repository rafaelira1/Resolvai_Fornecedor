# Estrutura e identidade do Fornecedor

A referência é o frontend Cliente, commit
[`03d2d6d184d273bdd1580b6982149cc21bbef1a7`](https://github.com/danilomarley/Resolvai_Cliente/tree/03d2d6d184d273bdd1580b6982149cc21bbef1a7),
especialmente `docs/STYLE_GUIDE.md`, `src/styles`, `components/dashboard` e as páginas de acesso.
As cores continuam sendo as do Fornecedor: laranja nas ações e destaques, navy na navegação e superfícies claras.

## Organização

- `src/routes/index.jsx`: rotas e navegação da aplicação. Mantém o guard e o layout profissional montados ao trocar páginas; a chave da tela continua considerando o caminho e os parâmetros do pedido.
- `src/components/layout/ProviderLayout.jsx`: sidebar, cabeçalho, breadcrumbs, acesso ao perfil e área principal. O menu móvel controla foco, Escape e rolagem, e fecha ao navegar ou voltar ao tamanho desktop.
- `src/components/layout/AuthLayout.jsx`: cartão central de login, recuperação de senha, cadastro e ativação.
- `src/components/dashboard`: navegação profissional e ilustração do banner, adaptadas da identidade do Cliente.
- `src/pages/<Nome>/index.jsx`: conteúdo e comportamento de cada tela. Os protótipos antigos sem rota ficam em `pages/legacy`.
- `src/styles`: tokens, fontes, reset, layouts, controles e estilos das telas.
- `public/brand` e `public/fonts`: marca vetorial, fontes e registros de origem/licenças.
- `src/services`, `hooks` e `data`: contratos, sessão, cache e regras existentes da aplicação.

## Alterar tamanhos em um único lugar

Edite `src/styles/variables.css`. As telas usam as variáveis diretamente; não é necessário procurar o mesmo tamanho em vários CSS.

| Variável | Valor padrão | Onde se aplica |
| --- | --- | --- |
| `--font-size-ui` | 14px | Texto padrão: menu lateral, cabeçalho, campos e componentes que usam esse tamanho |
| `--font-size-caption` | 12px | Legendas e rótulos menores |
| `--font-size-page-title-desktop` | 35px | Títulos principais das páginas profissionais |
| `--font-size-page-title-mobile` | 32px | Os mesmos títulos em telas móveis |
| `--font-size-section-title` | 20px | Títulos de seções e painéis |
| `--font-size-hero-title-desktop` | 34px | Título do banner; variantes wide/medium/compact/mobile ficam ao lado |
| `--font-size-stat-value-desktop` | 37px | Números de destaque do resumo; variantes móveis ficam ao lado |
| `--sidebar-width-desktop` | 248px | Largura da sidebar e recuo do conteúdo, juntos |
| `--sidebar-brand-gap` | 24px | Distância entre a marca completa e o menu |
| `--sidebar-item-height` | 42px | Altura das linhas do menu |
| `--content-padding-inline` | 38px | Alinhamento lateral do conteúdo e do cabeçalho |
| `--space-4` / `--space-6` | 16px / 24px | Espaçamentos compartilhados |
| `--radius-sm` / `--radius-md` | 8px / 12px | Bordas de controles e cards |
| `--control-height` / `--input-height` | 44px / 48px | Alturas dos controles comuns |

Exemplo: trocar `--font-size-ui: 14px` por `--font-size-ui: 15px` atualiza todos os componentes que usam o texto de interface.
Trocar a largura da sidebar atualiza também o recuo do conteúdo, evitando desalinhamento.
Os blocos `@media` no fim do arquivo escolhem os valores responsivos; os componentes não repetem esses valores.
O modo de janela baixa, até 700px de altura, reduz os espaçamentos da sidebar como no Cliente.
As condições dos `@media` são literais porque CSS nativo não permite `var()` nessas condições.

A sidebar usa a assinatura completa (símbolo, nome e slogan), sem uma segunda legenda que empurre o menu para baixo.
Na comparação visual entre aplicações, use o mesmo zoom do navegador e o mesmo tamanho de janela.

## Dimensões e componentes

A sidebar usa 248px, reduz para 224px e 210px em telas intermediárias e vira um drawer de 250px abaixo de 761px.
O cabeçalho tem 77px no desktop e 68px no mobile. O conteúdo tem limite de 1556px e padding inicial de 30px por 38px.
Cards usam bordas leves, raio de 12px e espaçamento de 16–24px. Controles usam raio de 8px e altura mínima de 44px.
O login usa cartão de até 420px; cadastro e ativação usam a versão ampla de até 760px.

Todas as telas profissionais, inclusive detalhe da oportunidade e envio de proposta, permanecem dentro do mesmo layout.
O acesso à ativação fica fora dele até o backend confirmar o perfil profissional.
Nenhuma ação de notificações, busca global ou suporte fictício foi adicionada.

## Fontes e marca

- Rajdhani 600/700: títulos e números de destaque.
- Inter 400/500/600/700: texto, tabelas, formulários e navegação.
- Alexandria regular: slogan do SVG original da marca.

Os WOFF2 são servidos pela própria aplicação, com `font-display: swap` e sem depender de Google Fonts/CDN no navegador.
As versões são as travadas no lock do Cliente; o manifesto em `public/fonts` registra URLs e integridade SHA512.
As licenças OFL acompanham os arquivos. A marca e a ilustração usam SVG; a origem está em `public/brand/ORIGIN.md`.
Textos de botões laranja usam navy para melhorar contraste; textos secundários usam o tom existente `#5f6b7b`.

## Validação

Execute `npm test`, `npm run lint` e `npm run build`. Os testes existentes continuam cobrindo autenticação,
ativação PF/PJ, recuperação de senha, dados reais, cache e navegação sem recarga. Os testes do layout cobrem foco,
fechamento do drawer, desbloqueio da rolagem no desktop e o atalho para o conteúdo sem alterar o hash da rota.

A conferência visual manual deve incluir login, cadastro/ativação, Home, oportunidades, filtros, detalhe,
envio de proposta, pedidos, detalhe do serviço e perfil em desktop e em uma largura móvel de 375–390px.
Também confira o menu móvel por teclado e o aumento da janela com o menu aberto.
