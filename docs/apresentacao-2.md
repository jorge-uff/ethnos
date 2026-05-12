# Ethnos — Documento da 2ª Apresentação

Adaptação digital do jogo de tabuleiro *Ethnos* (Paolo Mori / CMON, 2017) — demo funcional 2–6 jogadores rodando em tempo real via websockets.

## Endereço do repositório

**https://github.com/jorge-uff/ethnos**

Único repositório monorepo (pnpm workspaces + Turborepo) contendo frontend, backend, tipos compartilhados, migrations do banco, documentação e automação de CI.

---

## 1. Controle de versões

O projeto usa **Git** como sistema de controle de versão, hospedado no **GitHub**.

**Convenções adotadas:**

- `main` é a única branch de longa duração e representa a versão entregável.
- Todo trabalho acontece em *feature branches* criadas a partir de `main`.
- Não há commits diretos em `main` — toda mudança chega via Pull Request.
- Mensagens de commit são curtas, em imperativo (predominantemente em inglês, com algumas em português acompanhando o título da issue).
- Histórico preservado via merges explícitos (não rebase em `main`), permitindo navegar pelos PRs no `git log --graph`.

**Configuração local recomendada:** Node 20+, pnpm 10.33.0 (declarado em `packageManager` no `package.json` da raiz) e PostgreSQL acessível em `localhost:5432`.

---

## 2. Estratégia de ramificação

Foi adotada a estratégia **GitHub Flow** simplificada, com 1 issue → 1 branch → 1 PR → merge em `main`.

**Padrão de nome de branch:**

```
<num-issue>-<escopo-sem-colchete-nem-barra>-<título-kebab-com-acentos>
```

Exemplos reais do repositório:

- `1-backendfrontend-implementar-limite-de-10-cartas-na-mão`
- `2-calcular-pontuacao-de-gloria-pelo-tamanho-dos-bandos-ao-fim-de-cada-era`
- `3-backend-corrigir-distribuição-de-tokens-de-glória-por-posição-em-cada-era`
- `5-backendfrontend-implementar-critérios-de-desempate-na-pontuação-final`
- `8-devops-adicionar-github-actions-para-type-check-e-build-em-prs`
- `16-backend-sala-de-espera-não-atualiza-lista-de-jogadores-em-tempo-real`
- `18-backenddevops-adicionar-testes-unitários-de-lógica-de-jogo-e-integrá-los-ao-ci`
- `20-bug-desincronização-de-estado-de-turno-entre-jogadores`

Branches têm vida curta (horas a dois dias) e são descartadas após o merge. Isso mantém o `git log --graph` legível e elimina o risco de conflitos longos.

---

## 3. Controle de modificações (GitHub Issues)

Toda mudança não-trivial começa numa **issue**. O título carrega o escopo entre colchetes (`[Backend]`, `[Frontend]`, `[Backend/Frontend]`, `[DevOps]`, `[Bug]`) para indicar qual camada é tocada.

Cada issue descreve:

- Contexto/problema
- O que precisa ser feito
- Critério de aceite

A branch derivada da issue carrega seu número, e o PR vinculado fecha a issue automaticamente via `Closes #<n>` no corpo.

**Quadro de issues (11 issues, 11 fechadas — 100%):**

| #  | Título                                                                       | Estado |
|----|------------------------------------------------------------------------------|--------|
| 1  | [Backend/Frontend] Implementar limite de 10 cartas na mão                    | ✅     |
| 2  | [Backend] Calcular pontuação de Glória pelo tamanho dos Bandos ao fim da Era | ✅     |
| 3  | [Backend] Corrigir distribuição de tokens de Glória por posição em cada Era  | ✅     |
| 4  | [Backend] Descartar mão de todos os jogadores ao iniciar nova Era            | ✅     |
| 5  | [Backend/Frontend] Implementar critérios de desempate na pontuação final     | ✅     |
| 6  | [Backend/Frontend] Adicionar tela de placar intermediário ao fim de cada Era | ✅     |
| 7  | [Backend/Frontend] Implementar poderes das tribos ativados pela carta Líder  | ✅     |
| 8  | [DevOps] Adicionar GitHub Actions para type-check e build em PRs             | ✅     |
| 16 | [Backend] Sala de espera não atualiza lista de jogadores em tempo real       | ✅     |
| 18 | [Backend/DevOps] Testes unitários de lógica de jogo e integração ao CI       | ✅     |
| 20 | [Bug] Desincronização de estado de turno entre jogadores                     | ✅     |

---

## 4. Pull Requests com aprovações *(bônus)*

Todo merge para `main` passou por Pull Request com pelo menos uma aprovação registrada — nenhum merge direto ocorreu na branch principal. O repositório define um **template de PR padronizado em pt-BR** (`.github/pull_request_template.md`) com as seções:

- **O que foi feito**
- **Issue relacionada** (`Closes #N`)
- **Tipo de mudança** (Bug fix / Nova funcionalidade / Refatoração / DevOps / Documentação)
- **Como testar** (passo a passo)
- **Checklist** (type-check, build, testado localmente)

**Histórico dos 11 PRs mergeados (todos `MERGED`, todos `APPROVED`):**

| Título                                                              | Autor          | Aprovações | Δ linhas    | Arquivos |
|---------------------------------------------------------------------|----------------|-----------:|------------:|---------:|
| Add GitHub Actions CI and type-check script                         | jorge-uff      | 1          | +78 / −12   | 5        |
| Refactor game logic to enforce hand limit and update UI             | RafaelaAbrahao | 1          | +25 / −7    | 4        |
| Calcular pontuação de Glória pelo tamanho dos Bandos ao fim da Era  | Mariapaiva11   | 2          | +76 / −9    | 8        |
| Corrigir distribuição de tokens de Glória por posição               | jorge-uff      | 1          | +40 / −27   | 8        |
| Implement tiebreaker cascade for final game ranking                 | rattinho       | 2          | +80 / −23   | 4        |
| Descartar mão de todos os jogadores ao iniciar nova Era             | RafaelaAbrahao | 1          | +6 / −2     | 1        |
| Add age transition scoring and UI                                   | jorge-uff      | 1          | +228 / −10  | 4        |
| Broadcast game state after lobby updates                            | jorge-uff      | 1          | +7 / −0     | 1        |
| Add Vitest tests for API and enable CI run                          | jorge-uff      | 1          | +1282 / −2  | 7        |
| Update page.tsx (fix turn-state desync)                             | jorge-uff      | 1          | +5 / −10    | 1        |
| Implementar poderes das tribos ativados pela carta Líder            | DanielTouchon  | 1          | +489 / −114 | 7        |

Um PR adicional foi aberto pelo Daniel Touchon e fechado **sem merge** — substituído por um novo PR que reorganizou o trabalho dos poderes das tribos contra a branch oficial da issue.

---

## 5. Integração Contínua *(bônus)*

Pipeline definido em `.github/workflows/ci.yml`, disparado em **`pull_request` para `main`** e em **`push` para `main`**. Bloqueia o merge se qualquer etapa falhar.

**Etapas do job `Type-check & Build`:**

1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` (versão fixada em 10.33.0)
3. `actions/setup-node@v4` (Node 22, cache pnpm)
4. `pnpm install --frozen-lockfile`
5. `pnpm type-check` *(turbo type-check em `web`, `api` e `@ethnos/types`)*
6. `pnpm --filter api test` *(Vitest sobre `apps/api/src/game/__tests__/game.test.ts`)*
7. `pnpm build`

A etapa de testes foi incorporada após o merge do PR de testes unitários (issue #18), garantindo que as regras de jogo nunca regridam.

**Resultado**: nenhum PR foi mergeado com type-check, testes ou build quebrados.

---

## 6. Artefatos versionados no repositório

Tudo o que foi produzido ao longo do trabalho vive no Git:

### Código-fonte

- `apps/web/` — frontend Next.js 15 (App Router) + Tailwind CSS
- `apps/api/` — backend Fastify 5 + Socket.io 4 + Prisma 6
- `packages/types/` — tipos TypeScript compartilhados (`@ethnos/types`)

### Modelo de dados

- `apps/api/prisma/schema.prisma` — modelos `User`, `Game`, `Player` e enums
- `apps/api/prisma/migrations/20260511212752_init/migration.sql`
- `apps/api/.env.example`

### Lógica de jogo

- `apps/api/src/game/setup.ts` — seleção de tribos, montagem do deck, setup dos Reinos, início de Era, helpers de desempate
- `apps/api/src/game/actions.ts` — recrutar, jogar Bando, encerrar Era, despachar ação
- `apps/api/src/game/tribePowers.ts` — poderes ativados pelo Líder (Centauros, Elfos, Anões, Wingfolk, Gigantes, Wizards, Halflings, Sereias, Orcs, Esqueletos, Trolls, Minotauros)
- `apps/api/src/game/state.ts` — carregar/persistir estado e broadcast via Socket.io
- `apps/api/src/game/__tests__/game.test.ts` — testes Vitest cobrindo `setup.ts` e `actions.ts`

### Documentação

- `README.md` — visão geral e setup local
- `docs/scope.md` — escopo da demo (incluído/excluído/futuro)
- `docs/decisions.md` — decisões técnicas com justificativa
- `docs/game-rules.md` — resumo das regras do jogo de tabuleiro
- `docs/apresentacao-2.md` — este documento
- `CLAUDE.md` e `apps/web/CLAUDE.md` / `apps/web/AGENTS.md` — contexto operacional

### Automação e governança

- `.github/workflows/ci.yml` — pipeline de CI
- `.github/pull_request_template.md` — template de PR em pt-BR
- `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` — configuração do monorepo

### Infraestrutura

- `docker-compose.yml` — sobe um PostgreSQL local quando necessário

---

## 7. Decisões técnicas

Detalhes completos em `docs/decisions.md`. Síntese das escolhas que mais moldaram o projeto:

| Decisão                                              | Motivação                                                                                                  |
|------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| **Monorepo (pnpm workspaces + Turborepo)**           | Compartilhar tipos entre front e back sem duplicar; cache de tasks no Turborepo acelera CI e dev.          |
| **Estado autoritativo no servidor**                  | Toda lógica de jogo roda em `apps/api/src/game/`. Cliente nunca calcula estado, só renderiza.              |
| **Socket.io para ações de jogo, REST para auth/lobby** | Broadcast em tempo real onde precisa; HTTP/REST para operações pontuais (registro, login, criar sala).     |
| **Next.js 15 (App Router)**                          | Possibilita SEO, server components e features de produto futuras sem migração.                             |
| **Fastify 5**                                        | Performance e tipagem nativa via schemas JSON; melhor plugin system que Express.                           |
| **PostgreSQL + Prisma 6**                            | Migrations declarativas, tipos automáticos, dispensa boilerplate.                                          |
| **Estado de jogo como JSON no banco**                | `deckState`, `marketState`, `kingdomState`, `handState`, `bandsState` são colunas `Json` — leitura/escrita atômica, sem dezenas de queries por turno. |
| **Tribos: motor completo, poderes incrementais**     | O motor sempre conheceu as 12 tribos para validação de Bandos; os poderes individuais foram a última peça (issue #7). |
| **Vitest para testes de lógica**                     | Leve, integrado direto ao monorepo via filter pnpm, sem precisar levantar o servidor.                      |

---

## 8. Dificuldades enfrentadas

1. **Marcadores zerados antes do fim de jogo (issue #5).** O `endAge` zerava os marcadores dos Reinos *antes* de checar se o jogo havia acabado, inviabilizando o desempate por "marcadores totais" — `totalMarkers` seria 0 para todos no FINISHED. Correção: mover o reset para *depois* da bifurcação FINISHED/próxima Era.

2. **Desincronização de estado de turno (issue #20).** Em certos momentos o estado do servidor não chegava em todos os clientes, deixando jogadores vendo turnos diferentes. Resolvido garantindo broadcast via Socket.io a cada mutação relevante.

3. **Sala de espera estática (issue #16).** A lista de jogadores no lobby de uma partida específica não atualizava em tempo real. Solução: emitir `game:state` também após updates de lobby (join/leave), não apenas durante a partida.

4. **Distribuição incorreta de tokens por posição (issue #3).** A pontuação inicial premiava só o 1º lugar em cada Reino. Refatorado para distribuir tokens conforme a Era (1º na Era 1; 1º e 2º na Era 2; 1º, 2º e 3º na Era 3).

5. **Complexidade dos poderes das tribos (issue #7).** Doze poderes com semânticas diferentes (alguns mudam validação, outros mudam colocação de marcador, outros disparam ações pós-Bando). A primeira tentativa foi abandonada e refeita num segundo PR com uma função `applyLeaderPower` despachando por tribo, separando poderes que tocam a validação dos que executam após o Bando ser jogado.

6. **Equilibrar regra oficial vs. simplificação da demo.** Algumas divergências foram aceitas para entregar a demo no prazo e estão documentadas em `docs/scope.md` (seção *Divergências implementadas*): pontuação triangular dos Bandos, marcador colocado sem checar `marcadores < tamanho_do_bando`, turno encerra ao revelar Dragão, empate em Reino premia todos com o token cheio.

---

## 9. Monitoramento e controle do projeto

**Volumetria do desenvolvimento (10 a 12 de maio de 2026):**

| Métrica                                  | Valor       |
|------------------------------------------|------------:|
| Issues criadas                           | 11          |
| Issues fechadas                          | 11 (100%)   |
| Pull Requests abertos                    | 12          |
| Pull Requests mergeados                  | 11          |
| Pull Requests fechados sem merge         | 1 (#22)     |
| PRs com 2 ou mais aprovações             | 2           |
| Commits em `main`                        | ~25         |
| Contribuidores ativos                    | 5           |
| Builds CI verdes antes de cada merge     | 100%        |

**Distribuição dos PRs autorais por contribuidor:**

| Contribuidor          | PRs autorais |
|-----------------------|-------------:|
| Jorge Coutinho        | 6            |
| Rafaela Abrahão       | 2            |
| Maria Eduarda Paiva | 1            |
| Felipe Ratto          | 1            |
| Daniel Touchon        | 1            |

**Cadência:** o trabalho concentrou-se em três dias (10/05 com infraestrutura e CI; 11/05 com pontuação de Reinos e Bandos; 12/05 com fim de Era, desempate, testes, correções de socket e poderes das tribos).

---

## 10. Versão final do produto (demo)

A demo entrega o loop completo do jogo, do registro até o ranking final.

**Autenticação e lobby**
- Registro e login com JWT (rotas REST `/auth/register`, `/auth/login`).
- Lobby com criação de sala (2–6 jogadores), entrada via lista de salas abertas com polling a cada 5s, saída antes do início e início da partida pelo criador.

**Setup automático**
- Sorteio de 5 ou 6 tribos (conforme número de jogadores).
- Montagem do deck (12 cartas por tribo, 24 para Halflings) com os 3 Dragões embaralhados na metade inferior.
- Distribuição de fichas de Glória nos 6 Reinos em ordem crescente por Era.
- Cada jogador compra 1 carta no início de cada Era.

**Loop de turno em tempo real (Socket.io)**
- Recrutar do topo do deck fechado.
- Recrutar uma carta visível do mercado.
- Revelar Dragão automaticamente (3 Dragões = fim de Era imediato).
- Jogar Bando: 1 a 10 cartas, todas da mesma tribo OU mesma cor.
- Validação no servidor de tribo/cor, líder pertence ao Bando, cartas estão na mão.
- Escolha do Líder e do Reino-alvo via modal no frontend.
- Colocação automática de marcadores no Reino.
- Descarte automático da mão restante para o mercado.
- Limite de 10 cartas na mão imposto pelo servidor.

**Poderes ativados pelo Líder (issue #7)**
- 12 tribos com poderes implementados em `tribePowers.ts`. Poderes pós-Bando (Wizards, Anões, Elfos, Gigantes, Sereias, Orcs, Trolls) e poderes que afetam validação/colocação (Centauros, Halflings, Esqueletos, Minotauros, Wingfolk) são tratados nos pontos certos do fluxo.

**Pontuação e fim de Era**
- Detecção do 3º Dragão encerra a Era imediatamente.
- Pontuação dos Reinos por posição (1º na Era 1; 1º e 2º na Era 2; 1º, 2º e 3º na Era 3).
- Pontuação dos Bandos por tamanho.
- Descarte da mão de todos os jogadores ao iniciar nova Era.
- Tela de placar intermediário entre Eras.

**Fim de jogo e desempate**
- Ranking final com cascata oficial: Glória → marcadores totais → maior Bando da última Era → 2º maior → próximos.
- Marcadores totais e tamanho do maior Bando exibidos no ranking final para transparência.

**Qualidade**
- Testes Vitest cobrindo `setup.ts` e `actions.ts` rodam no CI.
- Type-check e build verdes em todos os PRs mergeados.

**Demonstração ao vivo** — fluxo sugerido:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Abrir `http://localhost:3000` em dois navegadores, registrar dois usuários, criar uma sala, iniciar a partida e jogar até o ranking final.

