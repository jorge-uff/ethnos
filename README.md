# Ethnos — Demo Digital

Adaptação digital do jogo de tabuleiro **Ethnos** (Paolo Mori / CMON, 2017). Demo funcional com as mecânicas principais do jogo rodando em tempo real via websockets.

## Sobre o jogo

Em Ethnos, jogadores recrutam aliados de 12 tribos diferentes (Elfos, Anões, Centauros, Orcs...) e formam Bandos de Aliados para controlar os 6 Reinos do tabuleiro. Ao fim de cada Era, quem tiver mais marcadores em cada Reino ganha fichas de Glória. Vence quem acumular mais Glória ao fim das 3 Eras.

## O que está implementado

- Registro, login e logout
- Lobby: criar sala, entrar em sala (2–6 jogadores), iniciar partida
- Setup automático: seleção aleatória de tribos, montagem do deck, distribuição de fichas de Glória nos 6 Reinos
- Loop de turno em tempo real:
  - Recrutar aliado do topo do deck
  - Recrutar aliado do mercado (cartas face-up)
  - Revelar Dragão (3 dragões = fim da Era)
  - Jogar Bando de Aliados (validação: mesma tribo ou mesma cor)
  - Escolha do Líder e do Reino alvo
  - Descarte automático da mão para o mercado ao jogar bando
- Pontuação de Reinos ao fim de cada Era
- Tela de resultado final com ranking

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS |
| Backend | Fastify 5 + Socket.io 4 |
| ORM | Prisma 6 |
| Banco | PostgreSQL |
| Monorepo | pnpm workspaces + Turborepo |

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL rodando localmente

> Sem PostgreSQL instalado? Suba com Docker:
> ```bash
> docker run --name ethnos-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
> ```

## Instalação

```bash
# 1. Clonar o repositório
git clone git@github.com:jorge-uff/ethnos.git
cd ethnos

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
```

Edite `apps/api/.env` com os dados do seu PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ethnos"
JWT_SECRET="troque-por-um-segredo-forte"
PORT=3001
WEB_URL="http://localhost:3000"
```

```bash
# 4. Criar o banco e rodar as migrations
pnpm db:migrate

# 5. Subir o projeto
pnpm dev
```

A aplicação estará disponível em:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001

## Estrutura do projeto

```
ethnos/
├── apps/
│   ├── web/          # Next.js — interface do usuário
│   └── api/          # Fastify — lógica de jogo e API REST
│       ├── src/
│       │   ├── game/         # motor do jogo (setup, ações, estado)
│       │   ├── routes/       # auth, lobby, ações de turno
│       │   ├── middleware/   # autenticação JWT
│       │   └── plugins/      # Prisma plugin
│       └── prisma/
│           └── schema.prisma
├── packages/
│   └── types/        # tipos TypeScript compartilhados (@ethnos/types)
└── docs/
    ├── scope.md      # funcionalidades incluídas e futuras
    ├── decisions.md  # decisões técnicas e de produto
    └── game-rules.md # resumo das regras do Ethnos
```

## Comandos úteis

```bash
pnpm dev           # sobe api + web em modo watch
pnpm build         # build de produção
pnpm db:migrate    # roda migrations do Prisma
pnpm db:studio     # abre o Prisma Studio no browser
pnpm type-check    # verifica tipos em todos os pacotes
```

## Como jogar (fluxo básico)

1. Registre dois usuários em abas/navegadores diferentes
2. Com o primeiro usuário, crie uma sala no Lobby
3. Com o segundo usuário, entre na sala
4. O criador clica em **Start Game**
5. Em turnos alternados, cada jogador pode:
   - Clicar **Draw from deck** para recrutar do deck
   - Clicar uma carta do mercado para recrutá-la
   - Selecionar cartas da mão e clicar **Play band** para jogar um Bando
6. Ao revelar o 3º Dragão, a Era termina e a pontuação é calculada automaticamente
7. Ao fim da última Era, o ranking final é exibido

## Documentação

- [`docs/scope.md`](docs/scope.md) — lista completa de features implementadas, pendentes e futuras
- [`docs/decisions.md`](docs/decisions.md) — decisões técnicas e de produto com justificativas
- [`docs/game-rules.md`](docs/game-rules.md) — resumo das regras do jogo de tabuleiro
