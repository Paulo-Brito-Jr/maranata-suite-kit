// Testes do módulo de fuso BRT — roda contra dist/ já buildado via
// self-reference do pacote (`node --test`, sem framework, igual aos demais
// scripts/*.test.mjs deste repo): `pnpm build && node --test scripts/date.test.mjs`.
//
// Todos os casos usam instantes absolutos (com "Z") ou comparam contra
// `Date.UTC`, para o resultado não depender do fuso da máquina que roda o
// teste — o bug que este módulo existe para evitar é exatamente esse.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BRT_TZ,
  dataISOBRT,
  diaSemanaBRT,
  fimDoDiaBRT,
  formatarDataBRT,
  formatarDataHoraBRT,
  horaBRT,
  inicioDoDiaBRT,
  minutoBRT,
  parseDataHoraBRT,
} from "@paulo-brito-jr/maranata-suite-kit/date";

// ---------------------------------------------------------------------------
// parseDataHoraBRT — o caso que motiva o módulo inteiro
// ---------------------------------------------------------------------------

test("parseDataHoraBRT: string sem timezone é lida como Brasília, não como UTC", () => {
  // 20:00 em Brasília == 23:00 UTC no mesmo dia.
  const d = parseDataHoraBRT("2026-07-30T20:00");
  assert.equal(d.toISOString(), "2026-07-30T23:00:00.000Z");
});

test("parseDataHoraBRT: é isso que o input datetime-local entrega", () => {
  // Sem o módulo, `new Date("2026-07-30T20:00")` no servidor UTC daria
  // 20:00Z — três horas adiantado. Este é o bug de produção.
  const comModulo = parseDataHoraBRT("2026-07-30T20:00");
  assert.notEqual(comModulo.toISOString(), "2026-07-30T20:00:00.000Z");
  assert.equal(comModulo.getTime(), Date.UTC(2026, 6, 30, 23, 0, 0));
});

test("parseDataHoraBRT: string com Z explícito não é reinterpretada", () => {
  const d = parseDataHoraBRT("2026-07-30T20:00:00Z");
  assert.equal(d.toISOString(), "2026-07-30T20:00:00.000Z");
});

test("parseDataHoraBRT: offset explícito (com e sem dois-pontos) passa direto", () => {
  assert.equal(parseDataHoraBRT("2026-07-30T20:00:00+02:00").toISOString(), "2026-07-30T18:00:00.000Z");
  assert.equal(parseDataHoraBRT("2026-07-30T20:00:00-0300").toISOString(), "2026-07-30T23:00:00.000Z");
});

test("parseDataHoraBRT: espaço em volta não atrapalha", () => {
  assert.equal(parseDataHoraBRT("  2026-07-30T20:00  ").toISOString(), "2026-07-30T23:00:00.000Z");
});

test("parseDataHoraBRT: aceita segundos e milissegundos", () => {
  assert.equal(parseDataHoraBRT("2026-07-30T20:00:30").toISOString(), "2026-07-30T23:00:30.000Z");
  assert.equal(parseDataHoraBRT("2026-07-30T20:00:30.500").toISOString(), "2026-07-30T23:00:30.500Z");
});

// ---------------------------------------------------------------------------
// Limites do dia
// ---------------------------------------------------------------------------

test("inicioDoDiaBRT / fimDoDiaBRT: cobrem o dia BRT inteiro, não o dia UTC", () => {
  const inicio = inicioDoDiaBRT("2026-07-30");
  const fim = fimDoDiaBRT("2026-07-30");
  assert.equal(inicio.toISOString(), "2026-07-30T03:00:00.000Z");
  assert.equal(fim.toISOString(), "2026-07-31T02:59:59.999Z");
  assert.ok(inicio < fim);
});

test("fimDoDiaBRT: 23:59 de Brasília cai dentro da janela do dia", () => {
  const inicio = inicioDoDiaBRT("2026-07-30");
  const fim = fimDoDiaBRT("2026-07-30");
  // 23:30 BRT = 02:30Z do dia seguinte — a armadilha clássica de filtro por dia.
  const quaseMeiaNoite = parseDataHoraBRT("2026-07-30T23:30");
  assert.ok(quaseMeiaNoite >= inicio && quaseMeiaNoite <= fim);
});

test("inicioDoDiaBRT: a virada de mês não escorrega", () => {
  assert.equal(inicioDoDiaBRT("2026-08-01").toISOString(), "2026-08-01T03:00:00.000Z");
});

// ---------------------------------------------------------------------------
// Acessores via Intl
// ---------------------------------------------------------------------------

test("horaBRT / minutoBRT: leem o relógio de Brasília, não o do servidor", () => {
  const d = new Date("2026-07-30T23:45:00Z"); // 20:45 em Brasília
  assert.equal(horaBRT(d), 20);
  assert.equal(minutoBRT(d), 45);
});

test("horaBRT: meia-noite BRT é 0, nunca 24", () => {
  const meiaNoite = new Date("2026-07-31T03:00:00Z"); // 00:00 BRT
  assert.equal(horaBRT(meiaNoite), 0);
});

test("diaSemanaBRT: 0 = domingo, no fuso certo", () => {
  // 2026-08-02 é um domingo. 01:00Z de segunda ainda é domingo 22:00 em BRT.
  assert.equal(diaSemanaBRT(new Date("2026-08-02T15:00:00Z")), 0);
  assert.equal(diaSemanaBRT(new Date("2026-08-03T01:00:00Z")), 0);
  assert.equal(diaSemanaBRT(new Date("2026-08-03T15:00:00Z")), 1);
});

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

test("formatarDataBRT: depois das 21h BRT ainda é o mesmo dia", () => {
  // 2026-07-31T01:00Z = 30/07 22:00 em Brasília. `toLocaleDateString("pt-BR")`
  // sem timeZone diria 31/07 num servidor UTC.
  assert.equal(formatarDataBRT(new Date("2026-07-31T01:00:00Z")), "30/07/2026");
});

test("formatarDataHoraBRT: data e hora juntas, em BRT", () => {
  assert.equal(formatarDataHoraBRT(new Date("2026-07-31T01:00:00Z")), "30/07/2026 22:00");
});

test("dataISOBRT: devolve o dia BRT, ao contrário de toISOString().slice(0,10)", () => {
  const d = new Date("2026-07-31T01:00:00Z");
  assert.equal(dataISOBRT(d), "2026-07-30");
  assert.equal(d.toISOString().slice(0, 10), "2026-07-31"); // o jeito errado, documentado
});

test("dataISOBRT ∘ inicioDoDiaBRT: ida e volta preserva o dia", () => {
  for (const dia of ["2026-01-01", "2026-07-30", "2026-08-01", "2026-12-31"]) {
    assert.equal(dataISOBRT(inicioDoDiaBRT(dia)), dia);
    assert.equal(dataISOBRT(fimDoDiaBRT(dia)), dia);
  }
});

test("BRT_TZ é o identificador IANA esperado", () => {
  assert.equal(BRT_TZ, "America/Sao_Paulo");
});
