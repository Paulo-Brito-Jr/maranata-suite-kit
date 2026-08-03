// Golden matrix do CONTRATO DE CONSUMO — o outro lado da golden matrix do
// motor (maranata-key/src/lib/permissions.test.ts): lá se especifica o token
// que a Key emite; aqui, o que TODO app da Suite decide ao ler esse token com
// can/canInApp/canSee. Os casos usam os MESMOS cenários do motor, já no shape
// que chega no app. Roda contra dist/ buildado, igual aos demais
// scripts/*.test.mjs: `pnpm build && node --test scripts/permissions.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  can,
  canInApp,
  canSee,
} from "@paulo-brito-jr/maranata-suite-kit/permissions";

// ── Tokens como a Key emite (golden matrix do motor, lado do consumo) ────────

const PISO_USUARIO = { eventos: ["view", "create", "edit"] };
const PISO_VIEWER = { eventos: ["view"] };
const COM_MANAGE = { eventos: ["view", "create", "edit", "delete", "manage"] };
// Pós-fix 2026-08-03 (maranata-key#44): deny de EDIT sobre MANAGE emite a
// lista SEM edit e SEM manage — o deny chega efetivo na ponta.
const DENY_EDIT_SOBRE_MANAGE = { eventos: ["view", "create", "delete"] };
// Deny de VIEW zera o recurso: a Key OMITE a chave do token.
const RECURSO_ZERADO = {};

test("piso USUARIO: ver/incluir/editar sim, excluir/gerenciar não", () => {
  assert.equal(can(PISO_USUARIO, "eventos", "view"), true);
  assert.equal(can(PISO_USUARIO, "eventos", "create"), true);
  assert.equal(can(PISO_USUARIO, "eventos", "edit"), true);
  assert.equal(can(PISO_USUARIO, "eventos", "delete"), false);
  assert.equal(can(PISO_USUARIO, "eventos", "manage"), false);
});

test("piso VIEWER: só view", () => {
  assert.equal(can(PISO_VIEWER, "eventos", "view"), true);
  assert.equal(can(PISO_VIEWER, "eventos", "edit"), false);
});

test("manage na lista implica qualquer ação (contrato do consumo)", () => {
  for (const acao of ["view", "create", "edit", "delete", "manage"]) {
    assert.equal(can(COM_MANAGE, "eventos", acao), true);
  }
  // ...inclusive quando manage vem sozinho — o motor garante que isso só
  // acontece quando nenhuma ação foi negada (deny derruba o selo).
  assert.equal(can({ eventos: ["manage"] }, "eventos", "delete"), true);
});

test("deny efetivo na ponta: lista sem edit e sem manage nega o edit", () => {
  assert.equal(can(DENY_EDIT_SOBRE_MANAGE, "eventos", "edit"), false);
  assert.equal(can(DENY_EDIT_SOBRE_MANAGE, "eventos", "delete"), true);
  assert.equal(can(DENY_EDIT_SOBRE_MANAGE, "eventos", "manage"), false);
});

test("recurso zerado (deny de view): can e canSee negam", () => {
  assert.equal(can(RECURSO_ZERADO, "eventos", "view"), false);
  assert.equal(canSee(RECURSO_ZERADO, "eventos"), false);
});

test("canSee: qualquer ação concedida mostra o menu; lista vazia esconde", () => {
  assert.equal(canSee(PISO_VIEWER, "eventos"), true);
  assert.equal(canSee({ eventos: [] }, "eventos"), false);
  assert.equal(canSee(PISO_VIEWER, "relatorios"), false);
});

test("perms nulo/indefinido: tudo negado, nada lança", () => {
  assert.equal(can(null, "eventos", "view"), false);
  assert.equal(can(undefined, "eventos", "view"), false);
  assert.equal(canSee(null, "eventos"), false);
  assert.equal(canInApp(undefined, "escala", "eventos", "view"), false);
});

test("canInApp: navega o shape completo por app; app ausente nega", () => {
  const porApp = { escala: PISO_USUARIO, financas: PISO_VIEWER };
  assert.equal(canInApp(porApp, "escala", "eventos", "edit"), true);
  assert.equal(canInApp(porApp, "financas", "eventos", "edit"), false);
  assert.equal(canInApp(porApp, "rodizio", "eventos", "view"), false);
});

test("grant preso ao recurso: edit em relatorios não vaza pra eventos", () => {
  const perms = { eventos: ["view"], relatorios: ["view", "edit"] };
  assert.equal(can(perms, "relatorios", "edit"), true);
  assert.equal(can(perms, "eventos", "edit"), false);
});
