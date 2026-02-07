

# Botao de Alerta de Disputa na Aba de Participacoes

## O que sera feito

Adicionar um painel de controle de alertas sonoros diretamente na aba "Autorizadas" (Robo) da pagina Minhas Participacoes. O usuario podera:

1. **Ver a posicao atual** de cada disputa ativa (ex: "1o de 5 competidores")
2. **Escolher o tipo de alerta**: Apito (beep sonoro) ou Comando de Voz IA (narracao por voz da situacao)
3. **Receber atualizacoes 24h** sobre mudancas de posicao, convocacoes e resultados

## Mudancas visuais

- Um card de controle sera adicionado no topo da aba "Autorizadas", logo abaixo do banner "Monitoramento do Robo 24/7"
- O card tera dois botoes lado a lado:
  - **Apito** (icone de sino): dispara alertas sonoros tipo beep quando houver mudanca
  - **Voz IA** (icone de microfone): ativa narracao por voz informando posicao, convocacao e resultado
- Indicador visual mostrando qual modo esta ativo (Apito ou Voz)
- Em cada `AutorizadaCard`, sera exibida a posicao simulada na disputa (ex: "2o lugar de 5") com badge colorido

## Detalhes tecnicos

### 1. Novo componente `DisputeAlertModeSelector`
- Arquivo: `src/components/voice/DisputeAlertModeSelector.tsx`
- Tres modos: **Desligado**, **Apito** (usa `playAlarmSound` do hook existente), **Voz IA** (usa `speakPosition`/`speakAlert` do hook existente)
- Preferencia salva no `localStorage` (chave: `disputeAlertMode`)
- Botao de teste para cada modo

### 2. Modificacao no `AutorizadaCard` (MinhasParticipacoes.tsx)
- Adicionar exibicao da posicao atual na disputa (badge com "Xo de Y")
- Integrar com o hook `useVoiceAlerts` existente
- Quando o robo estiver em status "disputando", mostrar posicao em destaque

### 3. Modificacao na pagina `MinhasParticipacoes.tsx`
- Importar e renderizar o `DisputeAlertModeSelector` dentro da aba "autorizadas"
- Posicionar entre o banner do robo e a lista de cards
- Passar o modo selecionado para os `AutorizadaCard`s para que usem o tipo correto de alerta

### 4. Atualizacao do hook `useVoiceAlerts.ts`
- Nenhuma mudanca necessaria -- o hook ja possui `speakPosition`, `speakCalled`, `speakVictory`, `speakDefeat` e `playAlarmSound`
- O novo componente apenas consumira essas funcoes existentes

### Arquivos afetados
- **Novo**: `src/components/voice/DisputeAlertModeSelector.tsx`
- **Editado**: `src/pages/MinhasParticipacoes.tsx` (importar componente, adicionar posicao nos cards)
