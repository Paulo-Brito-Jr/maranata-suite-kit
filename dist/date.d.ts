/**
 * Fuso horário de Brasília para a Suite Maranata.
 *
 * O problema que este módulo resolve: os apps rodam na Vercel, cujo servidor
 * está em **UTC**. Sem tratamento explícito, `new Date("2026-07-30T20:00")`
 * (o formato que um `<input type="datetime-local">` entrega) é interpretado
 * como UTC e gravado 3 horas adiantado. O mesmo vale na leitura —
 * `toLocaleDateString("pt-BR")` sem `timeZone` exibe o dia errado para
 * qualquer horário depois das 21h.
 *
 * Promovido de `agenda-maranata/lib/brt.ts`, onde a implementação nasceu e
 * foi validada em produção. A API é idêntica à de lá, mais os formatadores
 * (`formatarDataBRT`, `formatarDataHoraBRT`, `dataISOBRT`) que os apps
 * precisam para não repetir `{ timeZone: "America/Sao_Paulo" }` em cada
 * chamada.
 *
 * Brasil é **UTC-3 fixo** — o horário de verão acabou em 2019. Se um dia
 * voltar, o offset fixo aqui deixa de valer e a conversão passa a ser via
 * `Intl` em todos os casos.
 */
export declare const BRT_TZ = "America/Sao_Paulo";
/**
 * Interpreta "YYYY-MM-DDTHH:mm[:ss[.sss]]" (formato do input datetime-local,
 * sem timezone) como hora de Brasília. Strings que já vêm com timezone
 * explícito (Z ou offset +/-HH:mm) passam direto pro `new Date()` nativo —
 * não reinterpreta o que já é inequívoco.
 */
export declare function parseDataHoraBRT(s: string): Date;
/** Início do dia BRT (00:00:00.000) de uma string "YYYY-MM-DD". */
export declare function inicioDoDiaBRT(s: string): Date;
/** Fim do dia BRT (23:59:59.999) de uma string "YYYY-MM-DD". */
export declare function fimDoDiaBRT(s: string): Date;
/** Hora (0-23) de um Date no fuso BRT, via Intl — equivalente a getHours() mas em America/Sao_Paulo. */
export declare function horaBRT(d: Date): number;
/** Minuto (0-59) de um Date no fuso BRT, via Intl — equivalente a getMinutes() mas em America/Sao_Paulo. */
export declare function minutoBRT(d: Date): number;
/** Dia-da-semana (0=domingo) de um Date no fuso BRT, via Intl — equivalente a getDay() mas em America/Sao_Paulo. */
export declare function diaSemanaBRT(d: Date): number;
/**
 * Data no formato brasileiro "dd/mm/aaaa", sempre em BRT.
 *
 * Substitui `d.toLocaleDateString("pt-BR")` — que, sem `timeZone`, usa o fuso
 * do servidor (UTC na Vercel) e mostra o dia seguinte para qualquer horário
 * a partir das 21h de Brasília.
 */
export declare function formatarDataBRT(d: Date): string;
/** Data e hora "dd/mm/aaaa HH:mm", sempre em BRT. */
export declare function formatarDataHoraBRT(d: Date): string;
/**
 * Data no formato ISO "YYYY-MM-DD" **do dia em BRT** — o valor que um
 * `<input type="date">` espera.
 *
 * Diferente de `d.toISOString().slice(0, 10)`, que devolve o dia em UTC e
 * portanto erra a partir das 21h de Brasília. É a volta de `inicioDoDiaBRT`.
 */
export declare function dataISOBRT(d: Date): string;
//# sourceMappingURL=date.d.ts.map