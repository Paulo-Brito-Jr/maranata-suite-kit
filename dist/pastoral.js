/**
 * Tipos pastorais canônicos da Suite Maranata — conceito de ECOSSISTEMA.
 *
 * A verdade vive no Maranata Core (`Pastor.role` + `Pastor.isFullTime` +
 * `Pastor.churchId`), editada na prática pelo Rodízio (write-through). O
 * maranata-key traduz isso em grupos de permissão canônicos e emite o bloco
 * `pastoral` no JWT do SSO e no `/api/membership/[email]`:
 *
 *   pastoral: {
 *     tipo: "TITULAR" | "AUXILIAR" | "COLABORADOR",
 *     regime: "INTEGRAL" | "PARCIAL" | null,
 *     coreChurchId: string | null,   // igreja de lotação (Church.id do Core)
 *     funcoes: string[],             // funções pastorais ADITIVAS — ver abaixo
 *   } | null
 *
 * `funcoes` é aditiva: além do tipo-base exclusivo acima (um pastor só tem
 * UM tipo), ele pode acumular funções — hoje SENIOR, PRESIDENTE e
 * ADMINISTRATIVO (ver `FUNCOES_PASTORAIS`). PRESIDENTE é único no sistema;
 * essa unicidade é garantida no Core, não neste pacote. Campo aditivo e
 * fail-soft: tokens antigos (emitidos antes do rollout) chegam sem
 * `funcoes` — `parsePastoral` preenche `[]` nesse caso, nunca lança.
 *
 * Espelha `src/lib/pastoral.ts` do maranata-key. O que cada tipo/regime PODE
 * em cada app é a matriz dos grupos em key.maranata.app/admin/grupos — este
 * módulo só dá os tipos e helpers de leitura pro app cliente.
 */
/** Funções pastorais aditivas conhecidas (acumulam sobre o tipo-base). */
export const FUNCOES_PASTORAIS = ["SENIOR", "PRESIDENTE", "ADMINISTRATIVO"];
/** Slugs dos grupos canônicos no Key (informativo — via `groups` do JWT). */
export const PASTORAL_GROUP_SLUGS = {
    TITULAR: "pastores-titulares",
    AUXILIAR: "pastores-auxiliares",
    COLABORADOR: "pastores-colaboradores",
};
export const REGIME_GROUP_SLUGS = {
    INTEGRAL: "pastores-tempo-integral",
    PARCIAL: "pastores-tempo-parcial",
};
const TIPOS = ["TITULAR", "AUXILIAR", "COLABORADOR"];
const REGIMES = ["INTEGRAL", "PARCIAL"];
/**
 * Normaliza o `funcoes` cru do claim. Aceita ausente (token antigo, pré-
 * rollout) → `[]`; aceita array de strings, normalizando `trim().toUpperCase()`;
 * descarta qualquer item que não seja string (ou que vire vazio após o
 * trim) e qualquer valor que não seja array — nunca lança.
 */
function parseFuncoes(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        if (typeof item !== "string")
            continue;
        const normalizado = item.trim().toUpperCase();
        if (normalizado)
            out.push(normalizado);
    }
    return out;
}
/**
 * Valida/normaliza o claim `pastoral` cru vindo do JWT do Key (ou do
 * /api/membership). Qualquer shape inesperado → null (fail-soft, mesmo
 * espírito do fetchMembershipApps).
 */
export function parsePastoral(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    if (typeof o.tipo !== "string" || !TIPOS.includes(o.tipo))
        return null;
    const regime = typeof o.regime === "string" && REGIMES.includes(o.regime)
        ? o.regime
        : null;
    const coreChurchId = typeof o.coreChurchId === "string" && o.coreChurchId ? o.coreChurchId : null;
    const funcoes = parseFuncoes(o.funcoes);
    return { tipo: o.tipo, regime, coreChurchId, funcoes };
}
export function isPastor(p) {
    return Boolean(p);
}
export function isPastorTitular(p) {
    return p?.tipo === "TITULAR";
}
export function isPastorAuxiliar(p) {
    return p?.tipo === "AUXILIAR";
}
export function isPastorColaborador(p) {
    return p?.tipo === "COLABORADOR";
}
export function isTempoIntegral(p) {
    return p?.regime === "INTEGRAL";
}
export function isTempoParcial(p) {
    return p?.regime === "PARCIAL";
}
/**
 * Checa uma função pastoral aditiva qualquer (aceita string livre — inclui
 * futuras funções que o Core já emita antes deste pacote conhecê-las).
 */
export function temFuncaoPastoral(p, funcao) {
    return Boolean(p?.funcoes.includes(funcao));
}
export function isPastorSenior(p) {
    return temFuncaoPastoral(p, "SENIOR");
}
export function isPastorPresidente(p) {
    return temFuncaoPastoral(p, "PRESIDENTE");
}
export function isPastorAdministrativo(p) {
    return temFuncaoPastoral(p, "ADMINISTRATIVO");
}
/**
 * Escopo por igreja: o usuário é pastor E está lotado na igreja dada
 * (Church.id do Core). É o gate padrão de "só mexe na própria igreja".
 */
export function pastorDaIgreja(p, coreChurchId) {
    return Boolean(p && coreChurchId && p.coreChurchId === coreChurchId);
}
//# sourceMappingURL=pastoral.js.map