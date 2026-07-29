/**
 * Detalhe de escopo por grupo da Suite Maranata — conceito de ECOSSISTEMA
 * (F2 do épico Permissionamento v3).
 *
 * Hoje cada claim federado (`pastoral`, `lideranca`, `servico`) carrega a
 * própria noção de escopo/alcance (igreja, ministério, pilar), cada um com
 * a semântica do seu domínio de negócio. O Permissionamento v3 generaliza
 * isso: o **grupo** em si (a entidade de permissão do maranata-key,
 * key.maranata.app/admin/grupos) passa a carregar um detalhe de escopo
 * uniforme, permitindo que qualquer app calcule alcance ("esta pessoa, via
 * este grupo, alcança a igreja X?") sem conhecer a semântica de cada
 * domínio específico.
 *
 * Este contrato foi **congelado antes** da implementação no maranata-key —
 * a Fase 2 ainda não emite este claim em produção; o kit precisa do
 * parser/helpers prontos primeiro. O formato esperado por grupo, quando o
 * Key ligar a Fase 2 (nome exato do claim a definir lá):
 *
 *   {
 *     slug: string,                 // slug canônico do grupo no Key
 *     escopo: "GERAL" | "IGREJA" | "MINISTERIO" | "MINISTERIO_LOCAL" | "PILAR",
 *     coreChurchId?: string | null, // presente em IGREJA e MINISTERIO_LOCAL
 *     temaCodigo?: string | null,   // presente em MINISTERIO e MINISTERIO_LOCAL ("P.N", ex "2.1")
 *     pilarId?: number | null,      // presente em PILAR (1..12)
 *   }
 *
 * Alcance por escopo: GERAL/MINISTERIO/PILAR enxergam as 14 igrejas da
 * federação (não amarram a uma igreja específica); IGREJA e
 * MINISTERIO_LOCAL só alcançam a igreja do próprio `coreChurchId`.
 * `MINISTERIO_LOCAL` é a interseção de MINISTERIO (tem `temaCodigo`) com
 * IGREJA (tem `coreChurchId`) — por isso exige os dois campos.
 *
 * `parseGruposDetalhe` é fail-soft TOTAL, no mesmo espírito de
 * `parseServicos`/`parsePastoral`/`parseLiderancas`: claim ausente ou de
 * shape errado (não-array) vira `[]`; item de shape inesperado, com `slug`
 * vazio ou `escopo` desconhecido é descartado — nunca lança. A validação de
 * coerência cobre PRESENÇA do(s) campo(s) que o escopo exige (mapeamento
 * direto dos comentários "presente em X" acima — ex.: IGREJA sem
 * `coreChurchId` é descartado); campos ausentes NÃO são forçados pra
 * `null` (mantém `undefined`/`null` como vieram). O parser não vai além
 * disso: não valida o intervalo 1..12 de `pilarId` nem o formato "P.N" de
 * `temaCodigo` — isso é papel de `pilarDoTema`/`gruposDoPilar` na hora do
 * uso (um `pilarId`/`temaCodigo` fora do catálogo hoje conhecido
 * simplesmente não casa com nenhum pilar real, sem precisar descartar o
 * grupo inteiro do claim só por isso).
 */
const ESCOPOS_GRUPO = [
    "GERAL",
    "IGREJA",
    "MINISTERIO",
    "MINISTERIO_LOCAL",
    "PILAR",
];
/** Escopos cujo alcance não amarra a uma igreja específica (as 14 da federação). */
const ESCOPOS_SEM_IGREJA_UNICA = ["GERAL", "MINISTERIO", "PILAR"];
function isEscopoGrupo(value) {
    return ESCOPOS_GRUPO.includes(value);
}
/** `string` não vazia após trim; qualquer outra coisa (incl. ausência) vira `undefined`. */
function readStringField(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}
/**
 * Lê um campo opcional `string | null` do jeito que veio: `null` explícito
 * continua `null`; string válida vira a própria string (trimada); qualquer
 * outra coisa (ausente, tipo errado, string vazia) vira `undefined` — sem
 * fabricar `null` pra quem nunca mandou o campo.
 */
function readNullableString(value) {
    if (value === null)
        return null;
    return readStringField(value);
}
/**
 * Lê `pilarId` normalizando pra `number` (aceita número finito ou string
 * numérica — normalização pedida no contrato). `null` explícito continua
 * `null`; qualquer outra coisa inválida (tipo errado, NaN, string vazia)
 * vira `undefined`.
 */
function readPilarId(value) {
    if (value === null)
        return null;
    if (typeof value === "number")
        return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value.trim());
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
/**
 * Valida/normaliza o futuro claim de detalhe de grupo (Fase 2 do
 * Permissionamento v3, ainda não emitido pelo Key). Fail-soft TOTAL: `raw`
 * que não seja array vira `[]`; item que não seja objeto, com `slug`
 * vazio, `escopo` desconhecido, ou cujo escopo exija um campo ausente (ver
 * mapeamento "presente em X" no doc-comment do módulo) é descartado —
 * nunca lança. Normaliza `escopo` (`trim().toUpperCase()`) e `pilarId`
 * (número).
 */
export function parseGruposDetalhe(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== "object")
            continue;
        const o = item;
        const slug = readStringField(o.slug);
        if (!slug)
            continue;
        if (typeof o.escopo !== "string")
            continue;
        const escopo = o.escopo.trim().toUpperCase();
        if (!isEscopoGrupo(escopo))
            continue;
        const coreChurchId = readNullableString(o.coreChurchId);
        const temaCodigo = readNullableString(o.temaCodigo);
        const pilarId = readPilarId(o.pilarId);
        // Coerência: o escopo exige o campo (mapeamento "presente em X" do tipo).
        if ((escopo === "IGREJA" || escopo === "MINISTERIO_LOCAL") && !coreChurchId)
            continue;
        if ((escopo === "MINISTERIO" || escopo === "MINISTERIO_LOCAL") && !temaCodigo)
            continue;
        if (escopo === "PILAR" && (pilarId === undefined || pilarId === null))
            continue;
        const detalhe = { slug, escopo };
        if (coreChurchId !== undefined)
            detalhe.coreChurchId = coreChurchId;
        if (temaCodigo !== undefined)
            detalhe.temaCodigo = temaCodigo;
        if (pilarId !== undefined)
            detalhe.pilarId = pilarId;
        out.push(detalhe);
    }
    return out;
}
/**
 * Alcance por igreja: GERAL/MINISTERIO/PILAR alcançam as 14 igrejas da
 * federação (não amarram a uma igreja específica); IGREJA/MINISTERIO_LOCAL
 * só alcançam a igreja do próprio `coreChurchId`.
 */
export function escopoAlcancaIgreja(d, coreChurchId) {
    if (!d)
        return false;
    if (ESCOPOS_SEM_IGREJA_UNICA.includes(d.escopo))
        return true;
    return Boolean(coreChurchId) && d.coreChurchId === coreChurchId;
}
/** Filtra da lista os grupos cujo alcance cobre a igreja dada. */
export function gruposQueAlcancamIgreja(list, coreChurchId) {
    return (Array.isArray(list) ? list : []).filter((d) => escopoAlcancaIgreja(d, coreChurchId));
}
/** Grupos do ministério (tema) dado — escopos MINISTERIO e MINISTERIO_LOCAL com o código. */
export function gruposDoMinisterio(list, temaCodigo) {
    return (Array.isArray(list) ? list : []).filter((d) => (d.escopo === "MINISTERIO" || d.escopo === "MINISTERIO_LOCAL") && d.temaCodigo === temaCodigo);
}
/**
 * Grupos do pilar dado (1..12): inclui escopo PILAR com o `pilarId` igual,
 * E ministérios (MINISTERIO/MINISTERIO_LOCAL) cujo `temaCodigo` tem o
 * prefixo do pilar (`pilarDoTema(d.temaCodigo) === pilarId`, equivalente a
 * `codigo.split(".")[0] === String(pilarId)`).
 */
export function gruposDoPilar(list, pilarId) {
    return (Array.isArray(list) ? list : []).filter((d) => {
        if (d.escopo === "PILAR")
            return d.pilarId === pilarId;
        if (d.escopo === "MINISTERIO" || d.escopo === "MINISTERIO_LOCAL") {
            return typeof d.temaCodigo === "string" && pilarDoTema(d.temaCodigo) === pilarId;
        }
        return false;
    });
}
/**
 * Prefixo numérico do `temaCodigo` ("P.N", ex "2.1" → `2`) — a mesma leitura
 * usada por `gruposDoPilar`. `null` se o código não tiver um prefixo
 * numérico válido antes do primeiro ponto (incl. tipo errado, string vazia,
 * ou prefixo não-numérico).
 */
export function pilarDoTema(temaCodigo) {
    if (typeof temaCodigo !== "string")
        return null;
    const prefixo = temaCodigo.trim().split(".")[0];
    if (!prefixo || !/^\d+$/.test(prefixo))
        return null;
    const pilar = Number(prefixo);
    return pilar > 0 ? pilar : null;
}
//# sourceMappingURL=grupos.js.map