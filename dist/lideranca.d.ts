/**
 * Liderança ministerial canônica da Suite Maranata — conceito de ECOSSISTEMA.
 *
 * Postos vivem no Maranata Core (`/api/liderancas`), geridos na UI do
 * Ministério Maranata (write-through). O catálogo (12 pilares → 54 temas/
 * ministérios) vive no Ministério Maranata (`/api/external/pilares`) — os
 * postos referenciam por `pilarId` (1..12) e `temaCodigo` ("2.1"). O
 * maranata-key materializa os postos e emite no JWT do SSO:
 *
 *   lideranca: Array<{
 *     escopo: "LOCAL" | "GERAL" | "PILAR",
 *     pilarId?: number | null,       // escopo PILAR
 *     temaCodigo?: string | null,    // LOCAL/GERAL — ministério
 *     coreChurchId?: string | null,  // LOCAL — igreja do posto
 *   }>
 *
 * Regras de escopo nos apps: líder LOCAL acessa o seu ministério na sua
 * igreja; líder GERAL enxerga o ministério nas 14; responsável de PILAR
 * enxerga os ministérios do pilar. O que cada classe PODE vem da matriz dos
 * grupos no Key (lideres-ministeriais-locais/-gerais, responsaveis-pilar).
 *
 * Espelha `src/lib/lideranca.ts` do maranata-key.
 */
export type LiderancaEscopo = "LOCAL" | "GERAL" | "PILAR";
export type LiderancaInfo = {
    escopo: LiderancaEscopo;
    pilarId?: number | null;
    temaCodigo?: string | null;
    coreChurchId?: string | null;
};
/** Slugs dos grupos canônicos no Key (informativo). */
export declare const LIDERANCA_GROUP_SLUGS: Record<LiderancaEscopo, string>;
/**
 * Valida/normaliza o claim `lideranca` cru vindo do JWT do Key (ou do
 * /api/membership). Qualquer item de shape inesperado é descartado
 * (fail-soft) — retorno sempre é um array.
 */
export declare function parseLiderancas(raw: unknown): LiderancaInfo[];
export declare function temAlgumPosto(l: LiderancaInfo[] | null | undefined): boolean;
/** É líder GERAL do ministério (tema) dado — enxerga as 14 igrejas. */
export declare function isLiderGeralDe(l: LiderancaInfo[] | null | undefined, temaCodigo: string): boolean;
/** É líder LOCAL do ministério (tema) na igreja dada. */
export declare function isLiderLocalDe(l: LiderancaInfo[] | null | undefined, temaCodigo: string, coreChurchId: string | null | undefined): boolean;
/** É responsável pelo pilar dado (1..12). */
export declare function isResponsavelPilar(l: LiderancaInfo[] | null | undefined, pilarId: number): boolean;
/**
 * Gate combinado padrão pro quadro/dados de um ministério numa igreja:
 * líder GERAL do tema (qualquer igreja) OU líder LOCAL do tema naquela igreja.
 */
export declare function lideraMinisterioNaIgreja(l: LiderancaInfo[] | null | undefined, temaCodigo: string, coreChurchId: string | null | undefined): boolean;
//# sourceMappingURL=lideranca.d.ts.map