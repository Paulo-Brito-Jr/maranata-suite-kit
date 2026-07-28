// Testes do parser do claim `servico` — roda contra dist/ já buildado via
// self-reference do pacote (`node --test`, sem framework, igual aos demais
// scripts/*.test.mjs deste repo): `pnpm build && node --test scripts/servico.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FUNCOES_SERVICO,
  isCoordenadorEbd,
  isDiscipulador,
  isMentor,
  isProfessorEbd,
  parseServicos,
  servicoNaIgreja,
  temFuncaoServico,
} from "@paulo-brito-jr/maranata-suite-kit/servico";

test("FUNCOES_SERVICO: shape canônico", () => {
  assert.deepEqual(FUNCOES_SERVICO, [
    "PROFESSOR_EBD",
    "COORDENADOR_EBD",
    "DISCIPULADOR",
    "MENTOR",
  ]);
});

test("parseServicos: claim ausente/omitido → [] (ninguém federou nada)", () => {
  assert.deepEqual(parseServicos(undefined), []);
  assert.deepEqual(parseServicos(null), []);
});

test("parseServicos: raw totalmente inesperado nunca lança, sempre retorna array", () => {
  assert.deepEqual(parseServicos("string"), []);
  assert.deepEqual(parseServicos(42), []);
  assert.deepEqual(parseServicos({}), []);
  assert.deepEqual(parseServicos({ funcao: "PROFESSOR_EBD" }), []);
  assert.deepEqual(parseServicos(true), []);
});

test("parseServicos: item válido único, sem ministerioSlug", () => {
  const lista = parseServicos([{ funcao: "PROFESSOR_EBD", coreChurchId: "church-1" }]);
  assert.deepEqual(lista, [{ funcao: "PROFESSOR_EBD", coreChurchId: "church-1" }]);
  assert.ok(!("ministerioSlug" in lista[0]));
});

test("parseServicos: item válido com ministerioSlug", () => {
  const lista = parseServicos([
    { funcao: "DISCIPULADOR", coreChurchId: "church-1", ministerioSlug: "celulas" },
  ]);
  assert.deepEqual(lista, [
    { funcao: "DISCIPULADOR", coreChurchId: "church-1", ministerioSlug: "celulas" },
  ]);
});

test("parseServicos: normaliza `funcao` com trim + uppercase", () => {
  const lista = parseServicos([{ funcao: "  professor_ebd ", coreChurchId: null }]);
  assert.equal(lista[0].funcao, "PROFESSOR_EBD");
});

test("parseServicos: coreChurchId ausente/vazio/tipo errado vira null (função geral)", () => {
  assert.equal(parseServicos([{ funcao: "MENTOR" }])[0].coreChurchId, null);
  assert.equal(parseServicos([{ funcao: "MENTOR", coreChurchId: "" }])[0].coreChurchId, null);
  assert.equal(parseServicos([{ funcao: "MENTOR", coreChurchId: 123 }])[0].coreChurchId, null);
  assert.equal(parseServicos([{ funcao: "MENTOR", coreChurchId: null }])[0].coreChurchId, null);
});

test("parseServicos: mesma função N vezes com igrejas/ministérios diferentes (empilhável)", () => {
  const lista = parseServicos([
    { funcao: "PROFESSOR_EBD", coreChurchId: "church-1", ministerioSlug: "ebd-adultos" },
    { funcao: "PROFESSOR_EBD", coreChurchId: "church-2", ministerioSlug: "ebd-jovens" },
  ]);
  assert.equal(lista.length, 2);
  assert.equal(lista.filter((i) => i.funcao === "PROFESSOR_EBD").length, 2);
  assert.equal(lista[0].coreChurchId, "church-1");
  assert.equal(lista[1].coreChurchId, "church-2");
});

test("parseServicos: lixo — item malformado é descartado, nunca lança", () => {
  const lista = parseServicos([
    null,
    undefined,
    42,
    "string",
    [],
    {},
    { funcao: 123, coreChurchId: "church-1" },
    { funcao: "   ", coreChurchId: "church-1" },
    { coreChurchId: "church-1" },
    { funcao: "MENTOR", coreChurchId: "church-1" },
  ]);
  assert.deepEqual(lista, [{ funcao: "MENTOR", coreChurchId: "church-1" }]);
});

test("temFuncaoServico + atalhos (PROFESSOR_EBD/COORDENADOR_EBD/DISCIPULADOR/MENTOR)", () => {
  const lista = parseServicos([
    { funcao: "PROFESSOR_EBD", coreChurchId: "church-1" },
    { funcao: "MENTOR", coreChurchId: null },
  ]);
  assert.ok(temFuncaoServico(lista, "PROFESSOR_EBD"));
  assert.ok(!temFuncaoServico(lista, "DISCIPULADOR"));
  assert.ok(isProfessorEbd(lista));
  assert.ok(!isCoordenadorEbd(lista));
  assert.ok(!isDiscipulador(lista));
  assert.ok(isMentor(lista));
});

test("temFuncaoServico + atalhos são fail-soft com null/undefined", () => {
  assert.equal(temFuncaoServico(null, "MENTOR"), false);
  assert.equal(temFuncaoServico(undefined, "MENTOR"), false);
  assert.equal(isProfessorEbd(null), false);
  assert.equal(isCoordenadorEbd(undefined), false);
  assert.equal(isDiscipulador(null), false);
  assert.equal(isMentor(undefined), false);
});

test("servicoNaIgreja: match na mesma igreja", () => {
  const lista = parseServicos([{ funcao: "PROFESSOR_EBD", coreChurchId: "church-1" }]);
  assert.ok(servicoNaIgreja(lista, "PROFESSOR_EBD", "church-1"));
  assert.ok(!servicoNaIgreja(lista, "PROFESSOR_EBD", "church-2"));
  assert.ok(!servicoNaIgreja(lista, "DISCIPULADOR", "church-1"));
});

test("servicoNaIgreja: coreChurchId null = geral, vale em qualquer igreja pedida", () => {
  const lista = parseServicos([{ funcao: "MENTOR", coreChurchId: null }]);
  assert.ok(servicoNaIgreja(lista, "MENTOR", "church-1"));
  assert.ok(servicoNaIgreja(lista, "MENTOR", "church-2"));
  assert.ok(servicoNaIgreja(lista, "MENTOR", null));
  assert.ok(servicoNaIgreja(lista, "MENTOR", undefined));
});

test("servicoNaIgreja: sem coreChurchId pedido não casa função federada a uma igreja específica", () => {
  const lista = parseServicos([{ funcao: "PROFESSOR_EBD", coreChurchId: "church-1" }]);
  assert.ok(!servicoNaIgreja(lista, "PROFESSOR_EBD", null));
  assert.ok(!servicoNaIgreja(lista, "PROFESSOR_EBD", undefined));
});

test("servicoNaIgreja: fail-soft com null/undefined na lista", () => {
  assert.equal(servicoNaIgreja(null, "MENTOR", "church-1"), false);
  assert.equal(servicoNaIgreja(undefined, "MENTOR", "church-1"), false);
});

test("regressão: pessoa sem nenhuma função de servir → lista vazia, todos os helpers false", () => {
  const lista = parseServicos([]);
  assert.deepEqual(lista, []);
  assert.ok(!isProfessorEbd(lista));
  assert.ok(!isCoordenadorEbd(lista));
  assert.ok(!isDiscipulador(lista));
  assert.ok(!isMentor(lista));
  assert.ok(!servicoNaIgreja(lista, "MENTOR", "church-1"));
});
