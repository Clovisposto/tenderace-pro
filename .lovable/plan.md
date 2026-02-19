

# Plano de Correcoes para Producao

## Resumo

Corrigir 3 problemas criticos nas Edge Functions de captura, sem alterar a parte visual do sistema.

---

## Correcao 1: Erro HTTP 204 no PNCP (capturar-pncp)

**Problema:** A API PNCP retorna HTTP 204 (sem conteudo) para alguns estados. O codigo tenta fazer `response.json()` no corpo vazio, causando `SyntaxError`.

**Solucao:** Na funcao `capturePNCPReal`, apos verificar `response.ok` (linha 370-376), adicionar verificacao para HTTP 204 antes de chamar `.json()`:

```typescript
if (response.status === 204 || response.headers.get('content-length') === '0') {
  console.log(`[PNCP] Sem resultados para ${uf} (HTTP 204)`);
  continue;
}
```

**Remocao de dados falsos:** Remover a funcao `generateRepresentativePNCPData` (linhas 468-534) e o bloco de fallback que a chama (linhas 452-456). Quando a API nao retornar dados, simplesmente reportar `count: 0`.

---

## Correcao 2: Remover Dados Simulados dos 4 Portais Falsos (capturar-pncp)

**Problema:** As funcoes `captureBLL`, `captureComprasNet`, `captureComprasPublicas` e `capturePortalEstadual` no arquivo `capturar-pncp/index.ts` (linhas 536-919) geram dados fictícios quando as APIs falham (o que e sempre, ja que os endpoints nao existem).

**Solucao:** Simplificar cada funcao para:
1. Tentar a API real (manter o codigo existente)
2. Se falhar, retornar `count: 0` com `success: false` e mensagem de erro - SEM gerar dados falsos
3. Remover todos os blocos de fallback com dados hardcoded

Funcoes afetadas no `capturar-pncp/index.ts`:
- `captureBLL` (linhas 536-640): remover fallback de dados fictícios (linhas 601-640)
- `captureComprasNet` (linhas 641-756): remover fallback (linhas 722-753)
- `captureComprasPublicas` (linhas 758-865): remover fallback (linhas 824-863)
- `capturePortalEstadual` (linhas 868-918): esta funcao e 100% dados falsos, remover completamente ou retornar count: 0

---

## Correcao 3: Remover Dados Simulados do capturar-multiportal

**Problema:** O arquivo `capturar-multiportal/index.ts` tem o mesmo problema - todas as funcoes de captura usam `generatePortalDemoData`, `generateCaixaDemoData`, `generateBBDemoData` como fallback.

**Solucao:**
- Na funcao `capturePNCP` (linhas 270-376): remover todas as chamadas a `generatePortalDemoData` e retornar count: 0 quando a API falha
- `captureComprasPublicas` (linha 379-387): retornar count: 0 sem dados demo
- `captureBNC` (linhas 389-397): retornar count: 0 sem dados demo
- `captureBanpara` (linhas 399-406): retornar count: 0 sem dados demo
- `captureComprasNet` (linhas 408-416): retornar count: 0 sem dados demo
- `captureCaixa` (linhas 419-510): remover fallbacks para `generateCaixaDemoData`
- `captureBancoBrasil` (linhas 564-654): remover fallbacks para `generateBBDemoData`
- Remover as funcoes geradoras de dados falsos: `generatePortalDemoData` (linhas 710-769), `generateCaixaDemoData` (linhas 512-561), `generateBBDemoData` (linhas 657-707)

---

## Correcao 4: Autenticacao do pg_cron (run_captura_licitacoes)

**Problema:** A funcao SQL `run_captura_licitacoes` envia o `anon_key` como Bearer token. A edge function valida se o usuario tem role `admin`, mas com `anon_key` nao tem `sub` claim, causando o erro nos logs: `"invalid claim: missing sub claim"`.

**Solucao:** A funcao ja aceita o `service_role_key` como bypass de autenticacao. Atualizar a funcao SQL para usar o `service_role_key` em vez do `anon_key`. Isso sera feito via uma query SQL de atualizacao (INSERT tool, nao migration).

---

## Secao Tecnica - Arquivos Modificados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `supabase/functions/capturar-pncp/index.ts` | Tratar HTTP 204, remover todas as funcoes de dados falsos |
| `supabase/functions/capturar-multiportal/index.ts` | Remover todas as funcoes de dados falsos e fallbacks |
| Funcao SQL `run_captura_licitacoes` | Trocar `anon_key` por `service_role_key` |

**Nenhuma alteracao visual** sera feita. Apenas logica de backend.

---

## Resultado Esperado

Apos as correcoes:
- PNCP: captura dados reais da API oficial. Se a API estiver fora, reporta 0 licitacoes (sem dados falsos)
- Outros portais (BLL, ComprasNet, Caixa, BB, etc.): tentam APIs reais, reportam 0 se indisponiveis
- pg_cron: captura automatica funciona com autenticacao correta via service_role_key
- Banco de dados contera apenas dados reais capturados de APIs publicas

