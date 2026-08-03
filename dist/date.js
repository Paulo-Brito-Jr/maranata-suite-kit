// Módulo canônico de fuso da Suite Maranata (rollout tsk_WMyawpx7qs).
//
// Os apps rodam na Vercel (processo em UTC); os dados e os usuários são
// horário de Brasília (America/Sao_Paulo, UTC-3 fixo — sem horário de verão
// desde 2019). Sem tratamento, duas classes de bug aparecem depois das 21h
// BRT, quando o dia UTC já é o seguinte:
//
//   1. Parse: `new Date("YYYY-MM-DD")` é meia-noite UTC (= 21:00 BRT do dia
//      ANTERIOR) e `new Date("YYYY-MM-DDTHH:mm")` usa a TZ do processo — um
//      compromisso digitado às 20h grava 17h.
//   2. Leitura/formatação: `toLocaleDateString()`/`getHours()` sem timeZone
//      respondem no fuso do processo — telas e relatórios mostram o dia
//      errado à noite e janelas "do dia" perdem 21h–23h59.
//
// Este módulo substitui os `lib/brt.ts` locais criados nos fixes críticos de
// 27/jul/2026 (agenda, escala, 360, maranata-app) e é a única porta de
// entrada/saída de data-hora local nos apps da suite. Nenhum código de app
// deve voltar a chamar `new Date(stringSemTZ)`, `toLocale*` sem timeZone ou
// aritmética de -3h à mão — os guards `fuso-guard` de cada repo vigiam isso.
export const BRT_TZ = "America/Sao_Paulo";
// Offset fixo é seguro enquanto o Brasil não recriar o horário de verão; a
// LEITURA (partes/formatação) usa Intl com BRT_TZ e continuaria correta mesmo
// se o DST voltasse — só o PARSE de string sem timezone assume -03:00.
const BRT_OFFSET = "-03:00";
/** Timezone explícito no fim da string: "Z", "+HH:MM", "-HH:MM" ou "±HHMM". */
const TZ_SUFFIX_RE = /[zZ]$|[+-]\d{2}:?\d{2}$/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
// ---------------------------------------------------------------------------
// Parse (string digitada/armazenada em horário local BR → instante)
// ---------------------------------------------------------------------------
/**
 * "YYYY-MM-DDTHH:mm[:ss[.sss]]" (formato de <input type="datetime-local">,
 * "T" ou espaço, SEM timezone) interpretada como horário de Brasília.
 * Strings com timezone explícito (Z ou offset) passam direto pro `new Date()`
 * nativo — o que já é inequívoco não é reinterpretado.
 */
export function parseDataHoraLocalBR(valor) {
    const s = valor.trim();
    if (TZ_SUFFIX_RE.test(s))
        return new Date(s);
    if (DATE_ONLY_RE.test(s))
        return new Date(`${s}T00:00:00${BRT_OFFSET}`);
    return new Date(`${s.replace(" ", "T")}${BRT_OFFSET}`);
}
/**
 * "YYYY-MM-DD" (formato de <input type="date">) como o INÍCIO do dia em
 * Brasília — o substituto seguro de `new Date("YYYY-MM-DD")`, que seria
 * meia-noite UTC (21:00 BRT do dia anterior).
 */
export function parseDataLocalBR(dataISO) {
    return new Date(`${dataISO.trim()}T00:00:00${BRT_OFFSET}`);
}
/** 00:00:00.000 de Brasília do dia "YYYY-MM-DD" — início de janela de filtro. */
export function inicioDoDiaBRT(dataISO) {
    return parseDataLocalBR(dataISO);
}
/** 23:59:59.999 de Brasília do dia "YYYY-MM-DD" — fim de janela de filtro. */
export function fimDoDiaBRT(dataISO) {
    return new Date(`${dataISO.trim()}T23:59:59.999${BRT_OFFSET}`);
}
// ---------------------------------------------------------------------------
// Leitura (instante → partes no dia/hora de Brasília), via Intl
// ---------------------------------------------------------------------------
const PARTS_FMT = new Intl.DateTimeFormat("en-US", {
    timeZone: BRT_TZ,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});
const WEEKDAY_INDEX = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};
function partesBRT(instante) {
    const p = PARTS_FMT.formatToParts(instante).reduce((acc, x) => {
        if (x.type !== "literal")
            acc[x.type] = x.value;
        return acc;
    }, {});
    return {
        ano: Number(p.year),
        mes: Number(p.month),
        dia: Number(p.day),
        hora: Number(p.hour) % 24, // alguns runtimes devolvem "24" à meia-noite
        minuto: Number(p.minute),
        segundo: Number(p.second),
        diaSemana: WEEKDAY_INDEX[p.weekday ?? ""] ?? 0,
    };
}
/**
 * Normaliza a entrada dos leitores/formatadores: Date/number passam direto;
 * string SEM timezone é interpretada como horário de Brasília (via
 * parseDataHoraLocalBR) — é isso que impede "2026-08-04" de virar 03/08.
 */
function comoInstante(d) {
    return typeof d === "string" ? parseDataHoraLocalBR(d) : new Date(d);
}
/** "YYYY-MM-DD" do dia de Brasília de um instante (default: agora). */
export function diaBRT(d = new Date()) {
    const b = partesBRT(comoInstante(d));
    return `${b.ano}-${String(b.mes).padStart(2, "0")}-${String(b.dia).padStart(2, "0")}`;
}
/** "YYYY-MM-DD" do dia de Brasília corrente. */
export function hojeBRT() {
    return diaBRT(new Date());
}
/** O instante (ou string local BR) cai no dia de Brasília corrente? */
export function ehHojeBRT(d) {
    return diaBRT(d) === hojeBRT();
}
/** Hora (0-23) em Brasília — `getHours()` imune ao fuso do processo. */
export function horaBRT(d = new Date()) {
    return partesBRT(comoInstante(d)).hora;
}
/** Minuto (0-59) em Brasília. */
export function minutoBRT(d = new Date()) {
    return partesBRT(comoInstante(d)).minuto;
}
/** Dia-da-semana (0=domingo … 6=sábado) em Brasília — `getDay()` seguro. */
export function diaSemanaBRT(d = new Date()) {
    return partesBRT(comoInstante(d)).diaSemana;
}
/** {ano, mes} (mes 1-12) do calendário de Brasília — pra colunas ano/mês. */
export function anoMesBRT(d = new Date()) {
    const b = partesBRT(comoInstante(d));
    return { ano: b.ano, mes: b.mes };
}
// ---------------------------------------------------------------------------
// Formatação pt-BR (substitui toLocaleDateString/toLocaleString sem timeZone)
// ---------------------------------------------------------------------------
/** "dd/mm/aaaa" no dia de Brasília. Aceita Date, epoch ou string local BR. */
export function formatarDataBR(d) {
    const b = partesBRT(comoInstante(d));
    return `${String(b.dia).padStart(2, "0")}/${String(b.mes).padStart(2, "0")}/${b.ano}`;
}
/** "dd/mm/aaaa HH:mm" no horário de Brasília. */
export function formatarDataHoraBR(d) {
    const b = partesBRT(comoInstante(d));
    return `${String(b.dia).padStart(2, "0")}/${String(b.mes).padStart(2, "0")}/${b.ano} ${String(b.hora).padStart(2, "0")}:${String(b.minuto).padStart(2, "0")}`;
}
//# sourceMappingURL=date.js.map