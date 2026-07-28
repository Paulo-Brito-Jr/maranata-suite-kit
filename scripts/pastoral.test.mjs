// Testes do parser do claim `pastoral` — roda contra dist/ já buildado via
// self-reference do pacote (`node --test`, sem framework, igual aos demais
// scripts/*.test.mjs deste repo): `pnpm build && node --test scripts/pastoral.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FUNCOES_PASTORAIS,
  isPastorAdministrativo,
  isPastorAuxiliar,
  isPastorColaborador,
  isPastorPresidente,
  isPastorSenior,
  isPastorTitular,
  isTempoIntegral,
  parsePastoral,
  pastorDaIgreja,
  temFuncaoPastoral,
} from "@paulo-brito-jr/maranata-suite-kit/pastoral";

test("FUNCOES_PASTORAIS: shape canônico", () => {
  assert.deepEqual(FUNCOES_PASTORAIS, ["SENIOR", "PRESIDENTE", "ADMINISTRATIVO"]);
});

test("parsePastoral: payload sem `funcoes` (token antigo, pré-rollout) → funcoes: []", () => {
  const p = parsePastoral({ tipo: "TITULAR", regime: "INTEGRAL", coreChurchId: "church-1" });
  assert.ok(p);
  assert.deepEqual(p.funcoes, []);
  assert.equal(p.tipo, "TITULAR");
  assert.equal(p.regime, "INTEGRAL");
  assert.equal(p.coreChurchId, "church-1");
});

test("parsePastoral: `funcoes` válido normaliza trim + uppercase", () => {
  const p = parsePastoral({
    tipo: "TITULAR",
    regime: null,
    coreChurchId: null,
    funcoes: [" senior ", "Presidente", "administrativo"],
  });
  assert.ok(p);
  assert.deepEqual(p.funcoes, ["SENIOR", "PRESIDENTE", "ADMINISTRATIVO"]);
});

test("parsePastoral: `funcoes` lixo — descarta não-strings e vazios, nunca lança", () => {
  const p = parsePastoral({
    tipo: "AUXILIAR",
    regime: "PARCIAL",
    coreChurchId: null,
    funcoes: [123, null, undefined, {}, [], "  senior  ", "", "   "],
  });
  assert.ok(p);
  assert.deepEqual(p.funcoes, ["SENIOR"]);
});

test("parsePastoral: `funcoes` que não é array vira []", () => {
  const comString = parsePastoral({
    tipo: "COLABORADOR",
    regime: null,
    coreChurchId: null,
    funcoes: "SENIOR",
  });
  assert.ok(comString);
  assert.deepEqual(comString.funcoes, []);

  const comNull = parsePastoral({
    tipo: "COLABORADOR",
    regime: null,
    coreChurchId: null,
    funcoes: null,
  });
  assert.ok(comNull);
  assert.deepEqual(comNull.funcoes, []);

  const comObjeto = parsePastoral({
    tipo: "COLABORADOR",
    regime: null,
    coreChurchId: null,
    funcoes: { 0: "SENIOR" },
  });
  assert.ok(comObjeto);
  assert.deepEqual(comObjeto.funcoes, []);
});

test("parsePastoral: nunca lança mesmo com raw totalmente inesperado", () => {
  assert.equal(parsePastoral(null), null);
  assert.equal(parsePastoral(undefined), null);
  assert.equal(parsePastoral("string"), null);
  assert.equal(parsePastoral(42), null);
  assert.equal(parsePastoral([]), null);
  assert.equal(parsePastoral({ tipo: "INVALIDO" }), null);
  assert.equal(parsePastoral({ tipo: "TITULAR", funcoes: 42 }).funcoes.length, 0);
});

test("temFuncaoPastoral + helpers específicos (SENIOR/PRESIDENTE/ADMINISTRATIVO)", () => {
  const p = parsePastoral({
    tipo: "TITULAR",
    regime: "INTEGRAL",
    coreChurchId: "church-1",
    funcoes: ["SENIOR", "ADMINISTRATIVO"],
  });
  assert.ok(temFuncaoPastoral(p, "SENIOR"));
  assert.ok(!temFuncaoPastoral(p, "PRESIDENTE"));
  assert.ok(isPastorSenior(p));
  assert.ok(!isPastorPresidente(p));
  assert.ok(isPastorAdministrativo(p));
});

test("helpers de função pastoral são fail-soft com null/undefined", () => {
  assert.equal(temFuncaoPastoral(null, "SENIOR"), false);
  assert.equal(temFuncaoPastoral(undefined, "SENIOR"), false);
  assert.equal(isPastorSenior(null), false);
  assert.equal(isPastorPresidente(undefined), false);
  assert.equal(isPastorAdministrativo(null), false);
});

test("regressão: tipo/regime/coreChurchId continuam funcionando (zero breaking change)", () => {
  const titular = parsePastoral({ tipo: "TITULAR", regime: "INTEGRAL", coreChurchId: "church-1" });
  const auxiliar = parsePastoral({ tipo: "AUXILIAR", regime: "PARCIAL", coreChurchId: "church-2" });
  const colaborador = parsePastoral({ tipo: "COLABORADOR", regime: null, coreChurchId: null });

  assert.ok(isPastorTitular(titular));
  assert.ok(isPastorAuxiliar(auxiliar));
  assert.ok(isPastorColaborador(colaborador));
  assert.ok(isTempoIntegral(titular));
  assert.ok(pastorDaIgreja(titular, "church-1"));
  assert.ok(!pastorDaIgreja(auxiliar, "church-1"));
});
