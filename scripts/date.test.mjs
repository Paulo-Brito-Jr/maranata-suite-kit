// Testes do módulo canônico de fuso BRT (rollout tsk_WMyawpx7qs) — roda
// contra dist/ já buildado via self-reference do pacote (`node --test`, sem
// framework, igual aos demais scripts/*.test.mjs deste repo):
// `pnpm build && node --test scripts/date.test.mjs`.
//
// Os casos centrais são as viradas: depois das 21h BRT o dia UTC já é o
// seguinte — todo helper precisa responder o dia/hora de Brasília, nunca o
// do processo (a Vercel roda em UTC; máquina de dev roda em BRT — os
// asserts abaixo passam nos dois fusos porque comparam instantes absolutos).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BRT_TZ,
  anoMesBRT,
  diaBRT,
  diaSemanaBRT,
  ehHojeBRT,
  fimDoDiaBRT,
  formatarDataBR,
  formatarDataHoraBR,
  hojeBRT,
  horaBRT,
  inicioDoDiaBRT,
  minutoBRT,
  parseDataHoraLocalBR,
  parseDataLocalBR,
} from "@paulo-brito-jr/maranata-suite-kit/date";

// ---------------------------------------------------------------------------
// Parse — string local BR → instante absoluto
// ---------------------------------------------------------------------------

test("parseDataLocalBR: date-only é 00:00 BRT, nunca meia-noite UTC", () => {
  // O bug clássico: new Date("2026-08-04") = 2026-08-04T00:00Z = 21:00 BRT do dia 3.
  assert.equal(parseDataLocalBR("2026-08-04").toISOString(), "2026-08-04T03:00:00.000Z");
  assert.equal(parseDataLocalBR(" 2026-01-01 ").toISOString(), "2026-01-01T03:00:00.000Z");
});

test("parseDataHoraLocalBR: datetime-local sem TZ é hora de Brasília", () => {
  assert.equal(parseDataHoraLocalBR("2026-08-03T22:00").toISOString(), "2026-08-04T01:00:00.000Z");
  assert.equal(parseDataHoraLocalBR("2026-08-03T22:00:30").toISOString(), "2026-08-04T01:00:30.000Z");
  // Espaço no lugar do "T" (formato de banco/planilha) também vale.
  assert.equal(parseDataHoraLocalBR("2026-08-03 22:00").toISOString(), "2026-08-04T01:00:00.000Z");
  // Date-only pela porta de datetime cai no início do dia BRT.
  assert.equal(parseDataHoraLocalBR("2026-08-04").toISOString(), "2026-08-04T03:00:00.000Z");
});

test("parseDataHoraLocalBR: timezone explícito é respeitado, não reinterpretado", () => {
  assert.equal(parseDataHoraLocalBR("2026-08-03T22:00:00Z").toISOString(), "2026-08-03T22:00:00.000Z");
  assert.equal(parseDataHoraLocalBR("2026-08-03T22:00:00-03:00").toISOString(), "2026-08-04T01:00:00.000Z");
  assert.equal(parseDataHoraLocalBR("2026-08-03T22:00:00+0200").toISOString(), "2026-08-03T20:00:00.000Z");
});

test("inicioDoDiaBRT/fimDoDiaBRT: janela cobre o dia BRT inteiro, inclusive 21h-23h59", () => {
  assert.equal(inicioDoDiaBRT("2026-08-04").toISOString(), "2026-08-04T03:00:00.000Z");
  assert.equal(fimDoDiaBRT("2026-08-04").toISOString(), "2026-08-05T02:59:59.999Z");
  // 22:30 BRT do dia 4 (= 01:30Z do dia 5) está DENTRO da janela do dia 4.
  const nove_e_meia_da_noite = new Date("2026-08-05T01:30:00Z");
  assert.ok(nove_e_meia_da_noite >= inicioDoDiaBRT("2026-08-04"));
  assert.ok(nove_e_meia_da_noite <= fimDoDiaBRT("2026-08-04"));
});

// ---------------------------------------------------------------------------
// Leitura — instante → partes no calendário de Brasília
// ---------------------------------------------------------------------------

test("diaBRT: depois das 21h BRT o dia UTC já virou, o BRT não", () => {
  assert.equal(diaBRT(new Date("2026-08-04T02:30:00Z")), "2026-08-03");
  assert.equal(diaBRT(new Date("2026-08-04T03:00:00Z")), "2026-08-04");
  assert.equal(diaBRT("2026-08-04"), "2026-08-04"); // string local BR não desliza
});

test("hojeBRT/ehHojeBRT: coerentes entre si e com o formato YYYY-MM-DD", () => {
  assert.match(hojeBRT(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(ehHojeBRT(new Date()), true);
  assert.equal(ehHojeBRT(new Date(Date.now() + 48 * 3600 * 1000)), false);
});

test("horaBRT/minutoBRT: hora de Brasília, com meia-noite normalizada (nunca 24)", () => {
  assert.equal(horaBRT(new Date("2026-08-04T02:30:00Z")), 23);
  assert.equal(minutoBRT(new Date("2026-08-04T02:30:00Z")), 30);
  assert.equal(horaBRT(new Date("2026-08-04T03:00:00Z")), 0); // caso "24" do Intl
});

test("diaSemanaBRT: 0=domingo, calculado no dia BRT", () => {
  assert.equal(diaSemanaBRT(new Date("2026-01-01T12:00:00Z")), 4); // 01/01/2026 = quinta
  // 02/01 01:00Z ainda é quinta 22:00 em BRT.
  assert.equal(diaSemanaBRT(new Date("2026-01-02T01:00:00Z")), 4);
  assert.equal(diaSemanaBRT("2026-01-04"), 0); // domingo, via string local
});

test("anoMesBRT: virada de mês/ano segue o calendário de Brasília", () => {
  assert.deepEqual(anoMesBRT(new Date("2026-09-01T01:00:00Z")), { ano: 2026, mes: 8 }); // ainda 31/ago BRT
  assert.deepEqual(anoMesBRT(new Date("2027-01-01T01:00:00Z")), { ano: 2026, mes: 12 }); // ainda 31/dez BRT
  assert.deepEqual(anoMesBRT(new Date("2026-09-01T03:00:00Z")), { ano: 2026, mes: 9 });
});

// ---------------------------------------------------------------------------
// Formatação pt-BR
// ---------------------------------------------------------------------------

test("formatarDataBR: date-only nunca mostra o dia anterior", () => {
  // toLocaleDateString ingênuo com new Date("2026-08-04") mostraria 03/08/2026.
  assert.equal(formatarDataBR("2026-08-04"), "04/08/2026");
  assert.equal(formatarDataBR(new Date("2026-08-04T02:30:00Z")), "03/08/2026");
  assert.equal(formatarDataBR(new Date("2026-08-04T03:00:00Z")), "04/08/2026");
});

test("formatarDataHoraBR: dd/mm/aaaa HH:mm no horário de Brasília", () => {
  assert.equal(formatarDataHoraBR(new Date("2026-08-04T02:30:00Z")), "03/08/2026 23:30");
  assert.equal(formatarDataHoraBR("2026-08-03T22:00"), "03/08/2026 22:00");
  assert.equal(formatarDataHoraBR(new Date("2026-08-04T03:05:00Z")), "04/08/2026 00:05");
});

test("BRT_TZ exportado pra quem precisa de Intl direto (casos legítimos)", () => {
  assert.equal(BRT_TZ, "America/Sao_Paulo");
});
