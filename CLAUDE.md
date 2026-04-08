# Ethnos — CLAUDE.md

Guia de contexto para o assistente. Leia antes de qualquer tarefa.

## O que é este projeto

Adaptação digital do jogo de tabuleiro **Ethnos** (Paolo Mori / CMON, 2017).
Monorepo com frontend Next.js, backend Fastify e banco PostgreSQL.
O objetivo atual é uma **demo funcional** com as mecânicas principais do jogo.

Regras completas em: `docs/game-rules.md`

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + Tailwind CSS |
| Backend | Fastify 5 + Socket.io 4 |
| ORM | Prisma 6 |
| Banco | PostgreSQL |
| Monorepo | pnpm workspaces + Turborepo |
| Tipos compartilhados | `packages/types` (`@ethnos/types`) |

## Estrutura do monorepo

```
ethnos/
  apps/
    web/          # Next.js — porta 3000
    api/          # Fastify — porta 3001
  packages/
    types/        # tipos TypeScript compartilhados (@ethnos/types)
  docs/           # decisões, escopo, regras
  CLAUDE.md
```

## Decisões técnicas

Ver detalhes completos em `docs/decisions.md`. Resumo:

- **Monorepo** com pnpm workspaces para compartilhar tipos entre front e back
- **Fastify** no lugar de Express — melhor performance e tipagem nativa
- **Next.js** escolhido sobre Vite+React para possibilitar features de produto futuras (SEO, auth server-side)
- **Prisma** para migrations declarativas e tipos automáticos do banco
- **Socket.io** para sincronização de estado do jogo em tempo real
- **Estado do jogo** é autoritativo no servidor — clientes recebem o estado via socket, nunca calculam

## Escopo da demo

Ver `docs/scope.md` para a lista completa de features inclusas e excluídas.

**Incluído:**
- Auth (registro e login)
- Lobby (criar/entrar em sala, 2–6 jogadores)
- Setup automático (tribos, deck, fichas de Glória)
- Loop de turno: recrutar aliado ou jogar bando
- Validação de bando (mesma tribo ou mesma cor)
- Dragões revelados e fim de era
- Pontuação de reinos e bandos ao fim de cada era
- Condição de vitória

**Excluído da demo (futuro):**
- Poderes individuais das 12 tribos
- Tabuleiro Orc Horde
- Trilha das Sereias
- Token dos Gigantes
- Tokens dos Trolls
- Chat em tempo real
- Histórico de partidas
- Sistema de access codes

## Convenções de código

- TypeScript strict em todos os pacotes
- Tipos de domínio do jogo sempre importados de `@ethnos/types`
- Eventos Socket.io tipados via `ServerToClientEvents` / `ClientToServerEvents`
- Lógica de jogo reside exclusivamente no backend (`apps/api/src/game/`)
- Rotas REST para auth e lobby; Socket.io para ações de jogo em tempo real

## Como rodar localmente

```bash
# instalar dependências
pnpm install

# configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env

# rodar migrations
pnpm db:migrate

# subir tudo
pnpm dev
```
