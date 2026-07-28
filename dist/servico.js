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
];
/**
 * Valida/normaliza o claim `servico` cru vindo do JWT do Key (ou do
 * /api/membership). Fail-soft: nunca lança; qualquer item de shape
 * inesperado é descartado; `funcao` é normalizada `trim().toUpperCase()`
 * mas SEM allowlist rígida contra `FUNCOES_SERVICO` — o catálogo pode
 * crescer no Core/Key antes deste pacote ser atualizado. Claim ausente ou
 * de shape errado (não-array) → `[]` (ninguém federou nenhuma função).
 */
export function parseServicos(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== "object")
            continue;
        const o = item;
        if (typeof o.funcao !== "string")
            continue;
        const funcao = o.funcao.trim().toUpperCase();
        if (!funcao)
            continue;
        const coreChurchId = typeof o.coreChurchId === "string" && o.coreChurchId ? o.coreChurchId : null;
        const info = { funcao, coreChurchId };
        if (typeof o.ministerioSlug === "string" && o.ministerioSlug) {
            info.ministerioSlug = o.ministerioSlug;
        }
        out.push(info);
    }
    return out;
}
/** A lista tem a função dada (string livre — aceita catálogo futuro além de `FUNCOES_SERVICO`). */
export function temFuncaoServico(lista, funcao) {
    return Boolean(lista?.some((i) => i.funcao === funcao));
}
/**
 * Escopo por igreja: tem a função dada naquela igreja (Church.id do Core)
 * OU federada como geral (`coreChurchId: null`, vale em qualquer igreja).
 */
export function servicoNaIgreja(lista, funcao, coreChurchId) {
    return Boolean(lista?.some((i) => i.funcao === funcao &&
        (i.coreChurchId === null || (Boolean(coreChurchId) && i.coreChurchId === coreChurchId))));
}
export function isProfessorEbd(lista) {
    return temFuncaoServico(lista, "PROFESSOR_EBD");
}
export function isDiscipulador(lista) {
    return temFuncaoServico(lista, "DISCIPULADOR");
}
export function isMentor(lista) {
    return temFuncaoServico(lista, "MENTOR");
}
export function isCoordenadorEbd(lista) {
    return temFuncaoServico(lista, "COORDENADOR_EBD");
}
//# sourceMappingURL=servico.js.map