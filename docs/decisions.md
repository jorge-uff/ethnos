# Decisões Técnicas e de Produto

## Arquitetura

### Monorepo com pnpm workspaces + Turborepo
**Decisão:** estrutura monorepo com `apps/web`, `apps/api` e `packages/types`.  
**Motivo:** front e back compartilham muitos tipos (estado do jogo, eventos Socket.io, DTOs). Sem monorepo, esses tipos seriam duplicados e divergiriam.  
**Trade-off:** um pouco mais de complexidade no setup inicial, mas elimina uma classe inteira de bugs de contrato.

### Estado do jogo é autoritativo no servidor
**Decisão:** toda lógica de jogo roda em `apps/api/src/game/`. O cliente nunca calcula estado.  
**Motivo:** evita cheating e garante consistência entre jogadores. O cliente só renderiza o que recebe via socket.  
**Consequência:** o servidor precisa reenviar o estado completo (ou diff) após cada ação.

### Socket.io para ações de jogo, REST para auth/lobby
**Decisão:** ações de turno, revelação de dragões e fim de era via Socket.io. Login, registro e criação de sala via REST.  
**Motivo:** ações de jogo precisam ser broadcast para todos os jogadores em tempo real. Auth e lobby são operações pontuais sem necessidade de push.

### Next.js no lugar de Vite + React
**Decisão:** Next.js 15 com App Router.  
**Motivo:** possibilita features futuras como SEO na landing page, autenticação server-side (NextAuth) e Server Components para telas estáticas.  
**Trade-off:** mais pesado que Vite para uma SPA pura, mas o overhead é aceitável e a flexibilidade futura vale.

### Fastify no lugar de Express
**Decisão:** Fastify 5.  
**Motivo:** melhor performance, tipagem nativa via schemas JSON, plugin system mais organizado. O projeto original usava Express — deliberadamente migramos.

### PostgreSQL + Prisma
**Decisão:** PostgreSQL como banco único, Prisma como ORM.  
**Motivo:** o usuário já tem PostgreSQL instalado (sem necessidade de Docker extra). Prisma oferece migrations declarativas e tipos gerados automaticamente, reduzindo boilerplate.  
**Nota:** o estado do jogo (deck, mão, marcadores) é armazenado como JSON no banco durante a partida e reconstituído em memória pelo servidor.

---

## Modelo de dados

### Estado do jogo em JSON vs. tabelas normalizadas
**Decisão:** campos como `handState`, `bandsState`, `kingdomState` e `deckState` são JSON no banco.  
**Motivo:** o estado do jogo muda a cada ação e tem estrutura variável. Normalizar completamente geraria dezenas de queries por turno. JSON permite leitura e escrita atômica do estado.  
**Trade-off:** não é possível fazer queries complexas no estado interno. Aceitável porque o servidor carrega o estado completo em memória para processar cada ação.

---

## Produto

### Tribos: implementar todas no motor, poderes apenas no futuro
**Decisão:** o motor conhece as 12 tribos para setup e validação de bandos. Os poderes individuais são implementados incrementalmente.  
**Motivo:** setup e formação de bandos precisam das tribos. Os poderes são complexos e serão adicionados por fase.  
**Ordem sugerida de poderes:** Elfos → Anões → Centauros → Wingfolk → Minotauros → demais.

### 2–3 jogadores: regras especiais desabilitadas na demo
**Decisão:** a demo suporta 2–6 jogadores mas não aplica as regras especiais de 2–3 jogadores (2 eras, 5 tribos, pontuação diferente).  
**Motivo:** simplifica o motor para a demo. As regras especiais são bem documentadas e podem ser adicionadas depois.
