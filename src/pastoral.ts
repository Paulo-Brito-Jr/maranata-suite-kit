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
export const PASTORAL_GROUP_SLUGS: Record<PastoralTipo, string> = {
  TITULAR: "pastores-titulares",
  AUXILIAR: "pastores-auxiliares",
  COLABORADOR: "pastores-colaboradores",
};

export const REGIME_GROUP_SLUGS: Record<PastoralRegime, string> = {
  INTEGRAL: "pastores-tempo-integral",
  PARCIAL: "pastores-tempo-parcial",
};

const TIPOS: readonly string[] = ["TITULAR", "AUXILIAR", "COLABORADOR"];
const REGIMES: readonly string[] = ["INTEGRAL", "PARCIAL"];

/**
 * Valida/normaliza o claim `pastoral` cru vindo do JWT do Key (ou do
 * /api/membership). Qualquer shape inesperado → null (fail-soft, mesmo
 * espírito do fetchMembershipApps).
 */
export function parsePastoral(raw: unknown): PastoralInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { tipo?: unknown; regime?: unknown; coreChurchId?: unknown };
  if (typeof o.tipo !== "string" || !TIPOS.includes(o.tipo)) return null;
  const regime =
    typeof o.regime === "string" && REGIMES.includes(o.regime)
      ? (o.regime as PastoralRegime)
      : null;
  const coreChurchId = typeof o.coreChurchId === "string" && o.coreChurchId ? o.coreChurchId : null;
  return { tipo: o.tipo as PastoralTipo, regime, coreChurchId };
}

export function isPastor(p: PastoralInfo | null | undefined): p is PastoralInfo {
  return Boolean(p);
}

export function isPastorTitular(p: PastoralInfo | null | undefined): boolean {
  return p?.tipo === "TITULAR";
}

export function isPastorAuxiliar(p: PastoralInfo | null | undefined): boolean {
  return p?.tipo === "AUXILIAR";
}

export function isPastorColaborador(p: PastoralInfo | null | undefined): boolean {
  return p?.tipo === "COLABORADOR";
}

export function isTempoIntegral(p: PastoralInfo | null | undefined): boolean {
  return p?.regime === "INTEGRAL";
}

export function isTempoParcial(p: PastoralInfo | null | undefined): boolean {
  return p?.regime === "PARCIAL";
}

/**
 * Escopo por igreja: o usuário é pastor E está lotado na igreja dada
 * (Church.id do Core). É o gate padrão de "só mexe na própria igreja".
 */
export function pastorDaIgreja(
  p: PastoralInfo | null | undefined,
  coreChurchId: string | null | undefined,
): boolean {
  return Boolean(p && coreChurchId && p.coreChurchId === coreChurchId);
}
