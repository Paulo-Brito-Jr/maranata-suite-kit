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
export const LIDERANCA_GROUP_SLUGS: Record<LiderancaEscopo, string> = {
  LOCAL: "lideres-ministeriais-locais",
  GERAL: "lideres-ministeriais-gerais",
  PILAR: "responsaveis-pilar",
};

const ESCOPOS: readonly string[] = ["LOCAL", "GERAL", "PILAR"];

/**
 * Valida/normaliza o claim `lideranca` cru vindo do JWT do Key (ou do
 * /api/membership). Qualquer item de shape inesperado é descartado
 * (fail-soft) — retorno sempre é um array.
 */
export function parseLiderancas(raw: unknown): LiderancaInfo[] {
  if (!Array.isArray(raw)) return [];
  const out: LiderancaInfo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.escopo !== "string" || !ESCOPOS.includes(o.escopo)) continue;
    out.push({
      escopo: o.escopo as LiderancaEscopo,
      pilarId: typeof o.pilarId === "number" ? o.pilarId : null,
      temaCodigo: typeof o.temaCodigo === "string" ? o.temaCodigo : null,
      coreChurchId: typeof o.coreChurchId === "string" ? o.coreChurchId : null,
    });
  }
  return out;
}

export function temAlgumPosto(l: LiderancaInfo[] | null | undefined): boolean {
  return Boolean(l && l.length > 0);
}

/** É líder GERAL do ministério (tema) dado — enxerga as 14 igrejas. */
export function isLiderGeralDe(
  l: LiderancaInfo[] | null | undefined,
  temaCodigo: string,
): boolean {
  return Boolean(l?.some((i) => i.escopo === "GERAL" && i.temaCodigo === temaCodigo));
}

/** É líder LOCAL do ministério (tema) na igreja dada. */
export function isLiderLocalDe(
  l: LiderancaInfo[] | null | undefined,
  temaCodigo: string,
  coreChurchId: string | null | undefined,
): boolean {
  return Boolean(
    l?.some(
      (i) =>
        i.escopo === "LOCAL" &&
        i.temaCodigo === temaCodigo &&
        Boolean(coreChurchId) &&
        i.coreChurchId === coreChurchId,
    ),
  );
}

/** É responsável pelo pilar dado (1..12). */
export function isResponsavelPilar(
  l: LiderancaInfo[] | null | undefined,
  pilarId: number,
): boolean {
  return Boolean(l?.some((i) => i.escopo === "PILAR" && i.pilarId === pilarId));
}

/**
 * Gate combinado padrão pro quadro/dados de um ministério numa igreja:
 * líder GERAL do tema (qualquer igreja) OU líder LOCAL do tema naquela igreja.
 */
export function lideraMinisterioNaIgreja(
  l: LiderancaInfo[] | null | undefined,
  temaCodigo: string,
  coreChurchId: string | null | undefined,
): boolean {
  return isLiderGeralDe(l, temaCodigo) || isLiderLocalDe(l, temaCodigo, coreChurchId);
}
