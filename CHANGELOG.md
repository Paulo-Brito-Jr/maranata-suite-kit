# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento [SemVer](https://semver.org/lang/pt-BR/). Este arquivo começa na
0.16.1 — o histórico anterior está no `git log` (a versão vai no título do
commit/PR, ex.: `feat(app-switcher): … — 0.16.0 (#30)`).

## [0.16.1] — 2026-10-17

### Corrigido

- **`./sso` — `verifyMaranataKeyToken()` falha fechado no veredito do Key**
  (authz; tsk_aef3tPPESG). Da 0.14.0 à 0.16.0 a decisão era
  `j?.valid && j.user`: qualquer `valid` truthy (`"yes"`, `1`, `"true"`, `{}`,
  `[]`) autenticava, e qualquer `user` truthy (string, array) era devolvido como
  `MaranataKeyUser`. Agora só autentica resposta `2xx` com `valid === true`
  (booleano literal) e `user` objeto (nem `null`, nem array); qualquer outra
  forma devolve `null`. O contrato do Key é `{ valid: true, user }` em sucesso e
  `{ valid: false, error }` em falha (sem campos irmãos `ok`/`active`), então o
  tráfego real não muda — deixam de passar só respostas malformadas.
- Teste de regressão em `scripts/sso.test.mjs`: `valid` = `"yes"`, `1`,
  `"true"`, `"false"`, `-1`, `Infinity`, `{}`, `[]`…; `user` = string, número,
  booleano, array, `null`; corpo que não é objeto; campos irmãos que não valem;
  fluxo IBM (PKCE) com `valid` truthy.

### Para quem consome

- Sem mudança de API, de tipos nem de `exports`; muda só o `dist/sso.js` (e o
  JSDoc no `dist/sso.d.ts`).
- O kit chega aos apps como `vendor/maranata-suite-kit` (submódulo git, ou cópia
  do `dist/` em alguns apps): a correção entra quando o ponteiro/cópia avança
  para a 0.16.1 — por PR em cada app, depois do cooldown de 7 dias da
  publicação.
