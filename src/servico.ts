/**
 * Funções de servir canônicas da Suite Maranata — conceito de ECOSSISTEMA (F4).
 *
 * A verdade vive no maranata-escala (`Posicao` + `MembroMinisterio`), editada
 * na prática na própria Escala (write-through). O maranata-key sincroniza
 * isso e emite o bloco `servico` no JWT do SSO e no `/api/membership/[email]`:
 *
 *   servico: Array<{
 *     funcao: string,                // catálogo aberto — ver FUNCOES_SERVICO
 *     coreChurchId: string | null,   // igreja da federação; null = geral
 *     ministerioSlug?: string,       // ministério/turma de origem (informativo)
 *   }>
 *
 * Lista federada e empilhável: a MESMA função pode aparecer N vezes com
 * igrejas/ministérios diferentes (ex.: professor de EBD em duas igrejas ao
 * mesmo tempo). Claim omitido/ausente (token antigo, pré-rollout, ou pessoa
 * sem nenhuma função de servir) → `parseServicos` retorna `[]`, nunca lança —
 * mesmo espírito fail-soft de `parsePastoral`/`parseLiderancas`.
 *
 * `FUNCOES_SERVICO` é o catálogo conhecido hoje (extensível no futuro); o
 * parse NÃO valida contra essa allowlist — o Escala/Key podem passar a
 * emitir função nova antes deste pacote conhecê-la. Só normaliza
 * `trim().toUpperCase()`.
 *
 * Espelha `src/lib/servico.ts` do maranata-key.
 */

/** Catálogo de funções de servir conhecidas hoje (extensível no futuro). */
export const FUNCOES_SERVICO = [
  "PROFESSOR_EBD",
  "COORDENADOR_EBD",
  "DISCIPULADOR",
  "MENTOR",
] as const;

export type FuncaoServico = (typeof FUNCOES_SERVICO)[number];

export type ServicoInfo = {
  /** Função federada — string livre; catálogo conhecido em `FUNCOES_SERVICO`. */
  funcao: string;
  /** Igreja da federação (Church.id do Core); `null` = função geral (qualquer igreja). */
  coreChurchId: string | null;
  /** Ministério/turma de origem no Escala (informativo). */
  ministerioSlug?: string;
};

/**
 * Valida/normaliza o claim `servico` cru vindo do JWT do Key (ou do
 * /api/membership). Fail-soft: nunca lança; qualquer item de shape
 * inesperado é descartado; `funcao` é normalizada `trim().toUpperCase()`
 * mas SEM allowlist rígida contra `FUNCOES_SERVICO` — o catálogo pode
 * crescer no Core/Key antes deste pacote ser atualizado. Claim ausente ou
 * de shape errado (não-array) → `[]` (ninguém federou nenhuma função).
 */
export function parseServicos(raw: unknown): ServicoInfo[] {
  if (!Array.isArray(raw)) return [];
  const out: ServicoInfo[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.funcao !== "string") continue;
    const funcao = o.funcao.trim().toUpperCase();
    if (!funcao) continue;
    const coreChurchId =
      typeof o.coreChurchId === "string" && o.coreChurchId ? o.coreChurchId : null;
    const info: ServicoInfo = { funcao, coreChurchId };
    if (typeof o.ministerioSlug === "string" && o.ministerioSlug) {
      info.ministerioSlug = o.ministerioSlug;
    }
    out.push(info);
  }
  return out;
}

/** A lista tem a função dada (string livre — aceita catálogo futuro além de `FUNCOES_SERVICO`). */
export function temFuncaoServico(
  lista: ServicoInfo[] | null | undefined,
  funcao: string,
): boolean {
  return Boolean(lista?.some((i) => i.funcao === funcao));
}

/**
 * Escopo por igreja: tem a função dada naquela igreja (Church.id do Core)
 * OU federada como geral (`coreChurchId: null`, vale em qualquer igreja).
 */
export function servicoNaIgreja(
  lista: ServicoInfo[] | null | undefined,
  funcao: string,
  coreChurchId: string | null | undefined,
): boolean {
  return Boolean(
    lista?.some(
      (i) =>
        i.funcao === funcao &&
        (i.coreChurchId === null || (Boolean(coreChurchId) && i.coreChurchId === coreChurchId)),
    ),
  );
}

export function isProfessorEbd(lista: ServicoInfo[] | null | undefined): boolean {
  return temFuncaoServico(lista, "PROFESSOR_EBD");
}

export function isDiscipulador(lista: ServicoInfo[] | null | undefined): boolean {
  return temFuncaoServico(lista, "DISCIPULADOR");
}

export function isMentor(lista: ServicoInfo[] | null | undefined): boolean {
  return temFuncaoServico(lista, "MENTOR");
}

export function isCoordenadorEbd(lista: ServicoInfo[] | null | undefined): boolean {
  return temFuncaoServico(lista, "COORDENADOR_EBD");
}
