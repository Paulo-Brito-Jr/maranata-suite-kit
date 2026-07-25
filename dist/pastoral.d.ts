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
export type PastoralTipo = "TITULAR" | "AUXILIAR" | "COLABORADOR";
export type PastoralRegime = "INTEGRAL" | "PARCIAL";
export type PastoralInfo = {
    tipo: PastoralTipo;
    regime: PastoralRegime | null;
    /** Igreja de lotação do pastor (Church.id do Core) — escopo de permissão. */
    coreChurchId: string | null;
};
/** Slugs dos grupos canônicos no Key (informativo — via `groups` do JWT). */
export declare const PASTORAL_GROUP_SLUGS: Record<PastoralTipo, string>;
export declare const REGIME_GROUP_SLUGS: Record<PastoralRegime, string>;
/**
 * Valida/normaliza o claim `pastoral` cru vindo do JWT do Key (ou do
 * /api/membership). Qualquer shape inesperado → null (fail-soft, mesmo
 * espírito do fetchMembershipApps).
 */
export declare function parsePastoral(raw: unknown): PastoralInfo | null;
export declare function isPastor(p: PastoralInfo | null | undefined): p is PastoralInfo;
export declare function isPastorTitular(p: PastoralInfo | null | undefined): boolean;
export declare function isPastorAuxiliar(p: PastoralInfo | null | undefined): boolean;
export declare function isPastorColaborador(p: PastoralInfo | null | undefined): boolean;
export declare function isTempoIntegral(p: PastoralInfo | null | undefined): boolean;
export declare function isTempoParcial(p: PastoralInfo | null | undefined): boolean;
/**
 * Escopo por igreja: o usuário é pastor E está lotado na igreja dada
 * (Church.id do Core). É o gate padrão de "só mexe na própria igreja".
 */
export declare function pastorDaIgreja(p: PastoralInfo | null | undefined, coreChurchId: string | null | undefined): boolean;
//# sourceMappingURL=pastoral.d.ts.map