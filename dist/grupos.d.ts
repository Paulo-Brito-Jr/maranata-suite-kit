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
export type GrupoEscopo = "GERAL" | "IGREJA" | "MINISTERIO" | "MINISTERIO_LOCAL" | "PILAR";
export type GrupoDetalhe = {
    slug: string;
    escopo: GrupoEscopo;
    /** Igreja da federação (Church.id do Core); presente em IGREJA e MINISTERIO_LOCAL. */
    coreChurchId?: string | null;
    /** Código do ministério ("P.N", ex "2.1"); presente em MINISTERIO e MINISTERIO_LOCAL. */
    temaCodigo?: string | null;
    /** Pilar (1..12); presente em PILAR. */
    pilarId?: number | null;
};
/**
 * Valida/normaliza o futuro claim de detalhe de grupo (Fase 2 do
 * Permissionamento v3, ainda não emitido pelo Key). Fail-soft TOTAL: `raw`
 * que não seja array vira `[]`; item que não seja objeto, com `slug`
 * vazio, `escopo` desconhecido, ou cujo escopo exija um campo ausente (ver
 * mapeamento "presente em X" no doc-comment do módulo) é descartado —
 * nunca lança. Normaliza `escopo` (`trim().toUpperCase()`) e `pilarId`
 * (número).
 */
export declare function parseGruposDetalhe(raw: unknown): GrupoDetalhe[];
/**
 * Alcance por igreja: GERAL/MINISTERIO/PILAR alcançam as 14 igrejas da
 * federação (não amarram a uma igreja específica); IGREJA/MINISTERIO_LOCAL
 * só alcançam a igreja do próprio `coreChurchId`.
 */
export declare function escopoAlcancaIgreja(d: GrupoDetalhe, coreChurchId: string): boolean;
/** Filtra da lista os grupos cujo alcance cobre a igreja dada. */
export declare function gruposQueAlcancamIgreja(list: GrupoDetalhe[], coreChurchId: string): GrupoDetalhe[];
/** Grupos do ministério (tema) dado — escopos MINISTERIO e MINISTERIO_LOCAL com o código. */
export declare function gruposDoMinisterio(list: GrupoDetalhe[], temaCodigo: string): GrupoDetalhe[];
/**
 * Grupos do pilar dado (1..12): inclui escopo PILAR com o `pilarId` igual,
 * E ministérios (MINISTERIO/MINISTERIO_LOCAL) cujo `temaCodigo` tem o
 * prefixo do pilar (`pilarDoTema(d.temaCodigo) === pilarId`, equivalente a
 * `codigo.split(".")[0] === String(pilarId)`).
 */
export declare function gruposDoPilar(list: GrupoDetalhe[], pilarId: number): GrupoDetalhe[];
/**
 * Prefixo numérico do `temaCodigo` ("P.N", ex "2.1" → `2`) — a mesma leitura
 * usada por `gruposDoPilar`. `null` se o código não tiver um prefixo
 * numérico válido antes do primeiro ponto (incl. tipo errado, string vazia,
 * ou prefixo não-numérico).
 */
export declare function pilarDoTema(temaCodigo: string): number | null;
//# sourceMappingURL=grupos.d.ts.map