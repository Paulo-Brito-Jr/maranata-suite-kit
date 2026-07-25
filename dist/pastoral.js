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
 *   } | null
 *
 * Espelha `src/lib/pastoral.ts` do maranata-key. O que cada tipo/regime PODE
 * em cada app é a matriz dos grupos em key.maranata.app/admin/grupos — este
 * módulo só dá os tipos e helpers de leitura pro app cliente.
 */
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
    return { tipo: o.tipo, regime, coreChurchId };
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
 * Escopo por igreja: o usuário é pastor E está lotado na igreja dada
 * (Church.id do Core). É o gate padrão de "só mexe na própria igreja".
 */
export function pastorDaIgreja(p, coreChurchId) {
    return Boolean(p && coreChurchId && p.coreChurchId === coreChurchId);
}
//# sourceMappingURL=pastoral.js.map