

# IA Super Inteligente -- Assistente Discreto com Comando de Voz

## Problema Atual

O assistente atual (VoiceAIAssistant) ocupa uma area grande da tela (painel de 400x600px) quando aberto, atrapalhando a visao do sistema. O usuario quer uma IA que:
1. Seja **discreta** -- nao atrapalhe a visao do sistema
2. Funcione por **comando de voz** e texto
3. Execute **tudo** que for mandado (navegar, autorizar, consultar status, etc.)
4. Opere de forma **profissional** sem conflitos

## Solucao: Barra de Comando Flutuante Ultra-Discreta

Em vez de um painel de chat grande, a IA sera uma **barra compacta flutuante** no rodape da tela (estilo Spotlight/command bar), que:
- Fica **minimizada** como um pequeno icone discreto (apenas um circulo de 40px)
- Quando ativada, expande para uma **barra fina** no rodape (nao um painel gigante)
- Mostra a resposta da IA em uma **unica linha** que some automaticamente apos alguns segundos
- Nunca bloqueia a visao do sistema

```text
+----------------------------------------------------------+
|                    SISTEMA (visao completa)               |
|                                                          |
|                                                          |
|                                                          |
|                                                          |
+----------------------------------------------------------+
| [mic] Digite ou fale seu comando...        [resposta IA] |
+----------------------------------------------------------+
```

## Plano Tecnico

### 1. Criar componente `SmartCommandBar`

Novo arquivo: `src/components/ai/SmartCommandBar.tsx`

- **Estado minimizado**: Circulo pequeno (40px) no canto inferior direito com icone de microfone
- **Estado ativo**: Barra fina (48px de altura) fixa no rodape da tela, com:
  - Botao de microfone (esquerda)
  - Campo de texto (centro)
  - Resposta da IA aparece como toast/notificacao flutuante que some apos 5s
- **Sem painel de chat** -- respostas aparecem como notificacoes discretas que nao bloqueiam a tela

### 2. Logica de Comandos (reutilizar hooks existentes)

Reutilizar toda a infraestrutura ja existente:
- `useSpeechRecognition` -- reconhecimento de voz
- `useVoiceNavigation` -- navegacao por paginas
- `usePendingAlerts` -- status de licitacoes pendentes

Fast-path (sem chamar IA):
- Navegacao: "abre licitacoes", "vai para medicamentos"
- Acoes diretas: "autoriza tudo", "atualiza", "silencio"
- Status rapido: "quantas aguardando?", "status do sistema"

Caminho IA (para perguntas complexas):
- Chama a Edge Function `ai-assistant` que ja existe e funciona bem

### 3. Respostas por Voz (TTS)

- Usa ElevenLabs TTS (ja configurado na Edge Function `elevenlabs-tts`)
- Fallback para browser TTS
- Resposta falada + texto discreto na barra

### 4. Atualizar App.tsx

- Substituir `VoiceAIAssistant` por `SmartCommandBar`

### 5. Melhorias no Reconhecimento de Comandos

Ampliar a deteccao de comandos para cobrir mais variacoes:
- "autorizar" / "autoriza" / "autoriza tudo" / "autoriza todas" / "pode participar"
- "abre" / "abrir" / "vai para" / "mostra" / "quero ver"
- Tratamento de "para de falar" / "silencio" / "cala a boca"

## Resultado Final

- IA **invisivel** durante uso normal (apenas um pequeno icone)
- Ao clicar ou falar, barra **fina** aparece no rodape sem cobrir o sistema
- Respostas aparecem como **notificacoes discretas** que somem sozinhas
- Voz ativa para comandos e respostas
- Executa navegacao, autorizacao, consultas e perguntas complexas via IA
- Zero conflito com a interface do sistema

