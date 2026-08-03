// Testes do parser/helpers de detalhe de escopo por grupo (F2 do
// Permissionamento v3) — roda contra dist/ já buildado via self-reference do
// pacote (`node --test`, sem framework, igual aos demais scripts/*.test.mjs
// deste repo): `pnpm build && node --test scripts/grupos.test.mjs`.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  escopoAlcancaIgreja,
  gruposDoMinisterio,
  gruposDoPilar,
  gruposQueAlcancamIgreja,
  parseGruposDetalhe,
  pilarDoTema,
} from "@paulo-brito-jr/maranata-suite-kit/grupos";

// ---------------------------------------------------------------------------
// parseGruposDetalhe — raw totalmente inesperado nunca lança
// ---------------------------------------------------------------------------

test("parseGruposDetalhe: raw que não é array vira [], nunca lança", () => {
  assert.deepEqual(parseGruposDetalhe(undefined), []);
  assert.deepEqual(parseGruposDetalhe(null), []);
  assert.deepEqual(parseGruposDetalhe("string"), []);
  assert.deepEqual(parseGruposDetalhe(42), []);
  assert.deepEqual(parseGruposDetalhe(true), []);
  assert.deepEqual(parseGruposDetalhe({}), []);
  assert.deepEqual(parseGruposDetalhe({ 0: { slug: "x", escopo: "GERAL" } }), []);
});

test("parseGruposDetalhe: lixo variado no array — cada item inválido é descartado, nunca lança", () => {
  const lista = parseGruposDetalhe([
    null,
    undefined,
    42,
    "string",
    true,
    [],
    {},
    { slug: "sem-escopo" },
    { escopo: "GERAL" }, // sem slug
    { slug: "", escopo: "GERAL" }, // slug vazio
    { slug: "   ", escopo: "GERAL" }, // slug só espaço
    { slug: "escopo-invalido", escopo: "NAO_EXISTE" },
    { slug: "escopo-numero", escopo: 123 },
    { slug: "ok-geral", escopo: "geral" }, // válido, normaliza
  ]);
  assert.deepEqual(lista, [{ slug: "ok-geral", escopo: "GERAL" }]);
});

test("parseGruposDetalhe: retorna [] quando TODOS os itens são inválidos", () => {
  assert.deepEqual(parseGruposDetalhe([null, "x", {}, { slug: "a" }, { escopo: "GERAL" }]), []);
});

// ---------------------------------------------------------------------------
// parseGruposDetalhe — normalização
// ---------------------------------------------------------------------------

test("parseGruposDetalhe: normaliza escopo (trim + uppercase) e slug (trim)", () => {
  const lista = parseGruposDetalhe([{ slug: "  pastores-titulares  ", escopo: "  igreja  ", coreChurchId: "church-1" }]);
  assert.deepEqual(lista, [
    { slug: "pastores-titulares", escopo: "IGREJA", coreChurchId: "church-1" },
  ]);
});

test("parseGruposDetalhe: pilarId normaliza pra number (aceita string numérica)", () => {
  const lista = parseGruposDetalhe([{ slug: "responsaveis-pilar-2", escopo: "PILAR", pilarId: "2" }]);
  assert.equal(lista[0].pilarId, 2);
  assert.equal(typeof lista[0].pilarId, "number");
});

test("parseGruposDetalhe: campos ausentes não viram null — ficam de fato ausentes no objeto", () => {
  const [detalhe] = parseGruposDetalhe([{ slug: "geral-1", escopo: "GERAL" }]);
  assert.deepEqual(detalhe, { slug: "geral-1", escopo: "GERAL" });
  assert.ok(!("coreChurchId" in detalhe));
  assert.ok(!("temaCodigo" in detalhe));
  assert.ok(!("pilarId" in detalhe));
});

test("parseGruposDetalhe: null explícito é preservado como veio (não vira undefined)", () => {
  const [detalhe] = parseGruposDetalhe([
    { slug: "geral-2", escopo: "GERAL", coreChurchId: null, temaCodigo: null, pilarId: null },
  ]);
  assert.equal(detalhe.coreChurchId, null);
  assert.equal(detalhe.temaCodigo, null);
  assert.equal(detalhe.pilarId, null);
});

test("parseGruposDetalhe: campo extra não-exigido pelo escopo é mantido como veio", () => {
  // GERAL não exige coreChurchId, mas se vier junto (dado real do Key), o
  // parser não apaga — só valida o que o escopo exige.
  const [detalhe] = parseGruposDetalhe([
    { slug: "geral-com-igreja", escopo: "GERAL", coreChurchId: "church-9" },
  ]);
  assert.equal(detalhe.coreChurchId, "church-9");
});

// ---------------------------------------------------------------------------
// parseGruposDetalhe — coerência de escopo (campo exigido faltando é descarte)
// ---------------------------------------------------------------------------

test("coerência: IGREJA sem coreChurchId é descartado", () => {
  assert.deepEqual(parseGruposDetalhe([{ slug: "igreja-1", escopo: "IGREJA" }]), []);
  assert.deepEqual(parseGruposDetalhe([{ slug: "igreja-1", escopo: "IGREJA", coreChurchId: null }]), []);
  assert.deepEqual(parseGruposDetalhe([{ slug: "igreja-1", escopo: "IGREJA", coreChurchId: "" }]), []);
  assert.deepEqual(parseGruposDetalhe([{ slug: "igreja-1", escopo: "IGREJA", coreChurchId: 123 }]), []);
});

test("coerência: IGREJA com coreChurchId válido é mantido", () => {
  const lista = parseGruposDetalhe([{ slug: "igreja-1", escopo: "IGREJA", coreChurchId: "church-1" }]);
  assert.deepEqual(lista, [{ slug: "igreja-1", escopo: "IGREJA", coreChurchId: "church-1" }]);
});

test("coerência: MINISTERIO sem temaCodigo é descartado", () => {
  assert.deepEqual(parseGruposDetalhe([{ slug: "ministerio-1", escopo: "MINISTERIO" }]), []);
  assert.deepEqual(
    parseGruposDetalhe([{ slug: "ministerio-1", escopo: "MINISTERIO", temaCodigo: null }]),
    [],
  );
  assert.deepEqual(
    parseGruposDetalhe([{ slug: "ministerio-1", escopo: "MINISTERIO", temaCodigo: "   " }]),
    [],
  );
});

test("coerência: MINISTERIO com temaCodigo válido é mantido", () => {
  const lista = parseGruposDetalhe([{ slug: "ministerio-1", escopo: "MINISTERIO", temaCodigo: "2.1" }]);
  assert.deepEqual(lista, [{ slug: "ministerio-1", escopo: "MINISTERIO", temaCodigo: "2.1" }]);
});

test("coerência: MINISTERIO_LOCAL exige coreChurchId E temaCodigo — falta qualquer um descarta", () => {
  assert.deepEqual(
    parseGruposDetalhe([{ slug: "ml-1", escopo: "MINISTERIO_LOCAL", temaCodigo: "2.1" }]),
    [],
  );
  assert.deepEqual(
    parseGruposDetalhe([{ slug: "ml-1", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1" }]),
    [],
  );
  const lista = parseGruposDetalhe([
    { slug: "ml-1", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.1" },
  ]);
  assert.deepEqual(lista, [
    { slug: "ml-1", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.1" },
  ]);
});

test("coerência: PILAR sem pilarId (ausente ou null) é descartado", () => {
  assert.deepEqual(parseGruposDetalhe([{ slug: "pilar-1", escopo: "PILAR" }]), []);
  assert.deepEqual(parseGruposDetalhe([{ slug: "pilar-1", escopo: "PILAR", pilarId: null }]), []);
  assert.deepEqual(parseGruposDetalhe([{ slug: "pilar-1", escopo: "PILAR", pilarId: "abc" }]), []);
});

test("coerência: PILAR com pilarId válido (incl. 0 e fora de 1..12) é mantido — parser só checa presença", () => {
  // O parser normaliza e valida PRESENÇA; o intervalo 1..12 é regra de uso
  // (gruposDoPilar), não motivo de descarte do item no parse.
  assert.equal(parseGruposDetalhe([{ slug: "pilar-1", escopo: "PILAR", pilarId: 5 }])[0].pilarId, 5);
  assert.equal(parseGruposDetalhe([{ slug: "pilar-0", escopo: "PILAR", pilarId: 0 }])[0].pilarId, 0);
});

test("regressão: lista mista preserva ordem e só mantém os itens coerentes", () => {
  const lista = parseGruposDetalhe([
    { slug: "geral", escopo: "GERAL" },
    { slug: "igreja-sem-id", escopo: "IGREJA" },
    { slug: "igreja-ok", escopo: "IGREJA", coreChurchId: "church-1" },
    { slug: "ministerio-ok", escopo: "MINISTERIO", temaCodigo: "3.2" },
    { slug: "pilar-ok", escopo: "PILAR", pilarId: 3 },
  ]);
  assert.deepEqual(
    lista.map((d) => d.slug),
    ["geral", "igreja-ok", "ministerio-ok", "pilar-ok"],
  );
});

// ---------------------------------------------------------------------------
// escopoAlcancaIgreja / gruposQueAlcancamIgreja
// ---------------------------------------------------------------------------

test("escopoAlcancaIgreja: GERAL/MINISTERIO/PILAR alcançam qualquer igreja (as 14)", () => {
  assert.ok(escopoAlcancaIgreja({ slug: "g", escopo: "GERAL" }, "church-1"));
  assert.ok(escopoAlcancaIgreja({ slug: "m", escopo: "MINISTERIO", temaCodigo: "2.1" }, "church-9"));
  assert.ok(escopoAlcancaIgreja({ slug: "p", escopo: "PILAR", pilarId: 2 }, "qualquer-igreja"));
});

test("escopoAlcancaIgreja: IGREJA só alcança a própria igreja", () => {
  const d = { slug: "i", escopo: "IGREJA", coreChurchId: "church-1" };
  assert.ok(escopoAlcancaIgreja(d, "church-1"));
  assert.ok(!escopoAlcancaIgreja(d, "church-2"));
});

test("escopoAlcancaIgreja: MINISTERIO_LOCAL só alcança a própria igreja", () => {
  const d = { slug: "ml", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.1" };
  assert.ok(escopoAlcancaIgreja(d, "church-1"));
  assert.ok(!escopoAlcancaIgreja(d, "church-2"));
});

test("escopoAlcancaIgreja: fail-soft com detalhe null/undefined (uso indevido em JS puro)", () => {
  assert.equal(escopoAlcancaIgreja(null, "church-1"), false);
  assert.equal(escopoAlcancaIgreja(undefined, "church-1"), false);
});

test("gruposQueAlcancamIgreja: filtra a lista pelo alcance", () => {
  const lista = [
    { slug: "geral", escopo: "GERAL" },
    { slug: "igreja-1", escopo: "IGREJA", coreChurchId: "church-1" },
    { slug: "igreja-2", escopo: "IGREJA", coreChurchId: "church-2" },
    { slug: "ml-1", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.1" },
    { slug: "pilar", escopo: "PILAR", pilarId: 2 },
  ];
  assert.deepEqual(
    gruposQueAlcancamIgreja(lista, "church-1").map((d) => d.slug),
    ["geral", "igreja-1", "ml-1", "pilar"],
  );
});

test("gruposQueAlcancamIgreja: fail-soft com lista não-array", () => {
  assert.deepEqual(gruposQueAlcancamIgreja(null, "church-1"), []);
  assert.deepEqual(gruposQueAlcancamIgreja(undefined, "church-1"), []);
});

// ---------------------------------------------------------------------------
// gruposDoMinisterio
// ---------------------------------------------------------------------------

test("gruposDoMinisterio: casa MINISTERIO e MINISTERIO_LOCAL com o código exato", () => {
  const lista = [
    { slug: "m-2.1", escopo: "MINISTERIO", temaCodigo: "2.1" },
    { slug: "ml-2.1", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.1" },
    { slug: "m-2.2", escopo: "MINISTERIO", temaCodigo: "2.2" },
    { slug: "igreja", escopo: "IGREJA", coreChurchId: "church-1" },
    { slug: "pilar-2", escopo: "PILAR", pilarId: 2 },
  ];
  assert.deepEqual(
    gruposDoMinisterio(lista, "2.1").map((d) => d.slug),
    ["m-2.1", "ml-2.1"],
  );
});

test("gruposDoMinisterio: código é comparado por igualdade exata, não por prefixo", () => {
  const lista = [{ slug: "m-2.10", escopo: "MINISTERIO", temaCodigo: "2.10" }];
  assert.deepEqual(gruposDoMinisterio(lista, "2.1"), []);
});

test("gruposDoMinisterio: fail-soft com lista não-array", () => {
  assert.deepEqual(gruposDoMinisterio(null, "2.1"), []);
});

// ---------------------------------------------------------------------------
// gruposDoPilar / pilarDoTema
// ---------------------------------------------------------------------------

test("pilarDoTema: prefixo numérico válido antes do primeiro ponto", () => {
  assert.equal(pilarDoTema("2.1"), 2);
  assert.equal(pilarDoTema("10.5"), 10);
  assert.equal(pilarDoTema(" 3.4 "), 3);
  assert.equal(pilarDoTema("05.2"), 5);
});

test("pilarDoTema: null se inválido (tipo errado, vazio, sem prefixo numérico)", () => {
  assert.equal(pilarDoTema(""), null);
  assert.equal(pilarDoTema(".5"), null);
  assert.equal(pilarDoTema("abc"), null);
  assert.equal(pilarDoTema("abc.1"), null);
  assert.equal(pilarDoTema("-2.1"), null);
  assert.equal(pilarDoTema("0.5"), null);
  assert.equal(pilarDoTema(null), null);
  assert.equal(pilarDoTema(undefined), null);
  assert.equal(pilarDoTema(42), null);
});

test("gruposDoPilar: inclui escopo PILAR com o id igual", () => {
  const lista = [
    { slug: "pilar-2", escopo: "PILAR", pilarId: 2 },
    { slug: "pilar-3", escopo: "PILAR", pilarId: 3 },
  ];
  assert.deepEqual(
    gruposDoPilar(lista, 2).map((d) => d.slug),
    ["pilar-2"],
  );
});

test("gruposDoPilar: inclui MINISTERIO/MINISTERIO_LOCAL cujo temaCodigo tem o prefixo do pilar", () => {
  const lista = [
    { slug: "m-2.1", escopo: "MINISTERIO", temaCodigo: "2.1" },
    { slug: "ml-2.3", escopo: "MINISTERIO_LOCAL", coreChurchId: "church-1", temaCodigo: "2.3" },
    { slug: "m-3.1", escopo: "MINISTERIO", temaCodigo: "3.1" },
  ];
  assert.deepEqual(
    gruposDoPilar(lista, 2).map((d) => d.slug),
    ["m-2.1", "ml-2.3"],
  );
});

test("gruposDoPilar: combina PILAR + ministérios do mesmo pilar, exclui os demais", () => {
  const lista = [
    { slug: "pilar-2", escopo: "PILAR", pilarId: 2 },
    { slug: "m-2.1", escopo: "MINISTERIO", temaCodigo: "2.1" },
    { slug: "m-3.1", escopo: "MINISTERIO", temaCodigo: "3.1" },
    { slug: "pilar-3", escopo: "PILAR", pilarId: 3 },
  ];
  assert.deepEqual(
    gruposDoPilar(lista, 2).map((d) => d.slug),
    ["pilar-2", "m-2.1"],
  );
});

test("gruposDoPilar: GERAL/IGREJA nunca entram, mesmo carregando um pilarId avulso", () => {
  const lista = [
    { slug: "geral-com-pilar", escopo: "GERAL", pilarId: 2 },
    { slug: "igreja-com-pilar", escopo: "IGREJA", coreChurchId: "church-1", pilarId: 2 },
  ];
  assert.deepEqual(gruposDoPilar(lista, 2), []);
});

test("gruposDoPilar: fail-soft com lista não-array", () => {
  assert.deepEqual(gruposDoPilar(null, 2), []);
  assert.deepEqual(gruposDoPilar(undefined, 2), []);
});

// ---------------------------------------------------------------------------
// Cenário integrado — ciclo completo do claim cru até os helpers de alcance
// ---------------------------------------------------------------------------

test("cenário integrado: claim cru do Key → parse → alcance por igreja e por pilar", () => {
  const claimCru = [
    { slug: "todos-membros", escopo: "geral" },
    { slug: "pastores-igreja-sede", escopo: "IGREJA", coreChurchId: "church-sede" },
    { slug: "lideres-ebd-geral", escopo: "MINISTERIO", temaCodigo: "2.1" },
    {
      slug: "lideres-ebd-sede",
      escopo: "MINISTERIO_LOCAL",
      coreChurchId: "church-sede",
      temaCodigo: "2.3",
    },
    { slug: "responsavel-pilar-2", escopo: "PILAR", pilarId: 2 },
    { slug: "lixo-sem-escopo-valido", escopo: "INEXISTENTE" },
    { slug: "", escopo: "GERAL" },
  ];

  const lista = parseGruposDetalhe(claimCru);
  assert.equal(lista.length, 5);

  const naSede = gruposQueAlcancamIgreja(lista, "church-sede");
  assert.deepEqual(
    naSede.map((d) => d.slug),
    [
      "todos-membros",
      "pastores-igreja-sede",
      "lideres-ebd-geral",
      "lideres-ebd-sede",
      "responsavel-pilar-2",
    ],
  );

  const outraIgreja = gruposQueAlcancamIgreja(lista, "church-outra");
  assert.deepEqual(
    outraIgreja.map((d) => d.slug),
    ["todos-membros", "lideres-ebd-geral", "responsavel-pilar-2"],
  );

  const doPilar2 = gruposDoPilar(lista, 2);
  assert.deepEqual(
    doPilar2.map((d) => d.slug),
    ["lideres-ebd-geral", "lideres-ebd-sede", "responsavel-pilar-2"],
  );
});
