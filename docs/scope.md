# Escopo do Projeto

## Demo — Funcionalidades incluídas

### Fase 1 — Auth + Lobby ✅ Concluída
- [x] Registro de usuário (username, email, senha)
- [x] Login e logout
- [x] Criar sala (define número de jogadores, 2–6)
- [x] Entrar em sala via lista de salas abertas
- [x] Lista de salas abertas com polling a cada 5 segundos
- [x] Iniciar partida (apenas o criador da sala pode iniciar, mínimo 2 jogadores)

### Fase 2 — Setup Automático ✅ Concluída
- [x] Sortear 6 tribos aleatórias para compor o deck (5 para 2–3 jogadores)
- [x] Montar o deck com as 12 cartas de cada tribo selecionada (Halflings: 24)
- [x] Embaralhar os 3 Dragões na metade inferior do deck
- [x] Distribuir fichas de Glória nos 6 Reinos em ordem crescente por era
- [x] Cada jogador compra 1 carta no início de cada Era
- [x] Virar cartas do mercado (2× o número de jogadores)
- [x] Primeiro jogador da Era 1 aleatório; Eras seguintes: jogador com menos Glória

### Fase 3 — Loop de Turno ✅ Concluída
- [x] Indicar claramente de quem é a vez (destaque no header + anel na área do jogador)
- [x] Ação: recrutar aliado do topo do deck fechado
- [x] Ação: recrutar aliado do mercado (carta face-up, clicável)
- [x] Revelar Dragão ao ser sacado do deck (dragonsRevealed++, carta vai para o mercado como visível)
- [x] Ação: jogar um Bando de Aliados
- [x] Validação: todas as cartas do Bando devem ser da mesma Tribo ou mesma cor
- [x] Escolher o Líder do Bando (via modal)
- [x] Colocar marcadores de controle no Reino (quantidade = tamanho do Bando)
- [x] Descartar automaticamente cartas restantes da mão para o mercado após jogar Bando
- [x] Pontuação de Glória imediata por Bando (números triangulares: 1→1, 2→3, 3→6…)

> **Divergências implementadas (simplificações para a demo):**
> - Ao revelar um Dragão, o turno do jogador termina (regra real: jogador ainda compra outra carta)
> - Limite de 10 cartas na mão: servidor não bloqueia o recrutamento (apenas documentado)
> - Colocação de marcador: quantidade = tamanho do Bando (regra real tem restrição adicional: `marcadores_atuais < tamanho_do_bando`)
> - Pontuação de Glória por Bando: números triangulares (1,3,6,10…) em vez dos valores oficiais (0,1,3,6,10,15)

### Fase 4 — Fim de Era e Pontuação ✅ Concluída (simplificada)
- [x] Detectar o 3º Dragão e encerrar a Era imediatamente
- [x] Calcular maioria de marcadores em cada um dos 6 Reinos
- [x] Jogador(es) com mais marcadores no Reino ganham o token daquela Era
- [x] Empate: ambos os jogadores marcam (tokens não são divididos)
- [x] Ao fim da última Era: tela de fim de jogo com ranking por Glória
- [ ] Tela de placar intermediário ao fim de cada Era (antes da Era seguinte)
- [ ] Pontuação diferenciada por Era (Era 1: só 1º; Era 2: 1º e 2º; Era 3: 1º, 2º e 3º)
- [ ] Descarte de mão ao fim de Era para todos os jogadores
- [ ] Desempate: mais marcadores → maior Bando na última Era

---

## Futuro — Fora da demo

### Poderes das Tribos
- [ ] Centauros — jogar segundo Bando imediatamente após colocar marcador
- [ ] Elfos — manter X cartas na mão em vez de descartar todas
- [ ] Anões — Bando vale +1 carta na pontuação
- [ ] Wingfolk — colocar marcador em qualquer Reino (ignora cor do Líder)
- [ ] Minotauros — precisa de 1 carta a menos para colocar marcador
- [ ] Gigantes — Token Gigante (+2 Glória imediata + bônus fim de Era)
- [ ] Sereias — trilha das Sereias + marcador extra em certas casas
- [ ] Orcs — Orc Horde Board + saque de Glória no fim da Era
- [ ] Esqueletos — carta coringa, nunca Líder, removidos antes de pontuar
- [ ] Trolls — tokens de Troll para desempate de reinos
- [ ] Halflings — nunca colocam marcador, tribo com 24 cartas
- [ ] Wizards — comprar X cartas do deck após descartar mão

### Regras especiais 2–3 jogadores
- [ ] Apenas 2 Eras
- [ ] 5 tribos (em vez de 6)
- [ ] Remover tokens 4+ dos reinos
- [ ] Pontuação diferenciada na Era 2 para 2 jogadores

### Features de produto
- [ ] Chat em tempo real durante a partida
- [ ] Histórico de partidas e estatísticas por usuário
- [ ] Espectador (assistir partida sem jogar)
- [x] Sistema de access codes para registro restrito (implementado no ethnos-be legado)
- [ ] Perfil de usuário com avatar
- [ ] Notificações de turno (push/email)
- [ ] Suporte a bots (jogador automático)
- [ ] Modo torneio

---

## Regras de negócio críticas a implementar corretamente

Estes pontos têm lógica não-óbvia — prestar atenção na implementação:

1. **Deck setup:** Dragões devem ser embaralhados APENAS na metade inferior do deck ✅
2. **Limite de mão:** jogador com 10 cartas é OBRIGADO a jogar um Bando ⚠️ não bloqueado ainda
3. **Colocação de marcador:** `marcadores_atuais_do_jogador_no_reino < tamanho_do_bando` ⚠️ simplificado
4. **Descarte obrigatório:** ao jogar um Bando, TODAS as cartas restantes na mão vão para o mercado ✅
5. **Dragão:** ao ser sacado do deck, é revelado e o jogador compra OUTRA carta ⚠️ simplificado (turno encerra)
6. **Fim de Era imediato:** ao revelar o 3º Dragão, a Era acaba antes de qualquer outro jogador agir ✅
7. **Pontuação de Bandos:** calculada no momento de jogar (não ao fim da Era) ⚠️ difere do oficial
8. **Primeiro jogador nas Eras 2 e 3:** quem tiver MENOS Glória ✅
