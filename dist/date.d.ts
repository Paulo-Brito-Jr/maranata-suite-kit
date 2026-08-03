export declare const BRT_TZ = "America/Sao_Paulo";
/**
 * "YYYY-MM-DDTHH:mm[:ss[.sss]]" (formato de <input type="datetime-local">,
 * "T" ou espaço, SEM timezone) interpretada como horário de Brasília.
 * Strings com timezone explícito (Z ou offset) passam direto pro `new Date()`
 * nativo — o que já é inequívoco não é reinterpretado.
 */
export declare function parseDataHoraLocalBR(valor: string): Date;
/**
 * "YYYY-MM-DD" (formato de <input type="date">) como o INÍCIO do dia em
 * Brasília — o substituto seguro de `new Date("YYYY-MM-DD")`, que seria
 * meia-noite UTC (21:00 BRT do dia anterior).
 */
export declare function parseDataLocalBR(dataISO: string): Date;
/** 00:00:00.000 de Brasília do dia "YYYY-MM-DD" — início de janela de filtro. */
export declare function inicioDoDiaBRT(dataISO: string): Date;
/** 23:59:59.999 de Brasília do dia "YYYY-MM-DD" — fim de janela de filtro. */
export declare function fimDoDiaBRT(dataISO: string): Date;
/** "YYYY-MM-DD" do dia de Brasília de um instante (default: agora). */
export declare function diaBRT(d?: Date | string | number): string;
/** "YYYY-MM-DD" do dia de Brasília corrente. */
export declare function hojeBRT(): string;
/** O instante (ou string local BR) cai no dia de Brasília corrente? */
export declare function ehHojeBRT(d: Date | string | number): boolean;
/** Hora (0-23) em Brasília — `getHours()` imune ao fuso do processo. */
export declare function horaBRT(d?: Date | string | number): number;
/** Minuto (0-59) em Brasília. */
export declare function minutoBRT(d?: Date | string | number): number;
/** Dia-da-semana (0=domingo … 6=sábado) em Brasília — `getDay()` seguro. */
export declare function diaSemanaBRT(d?: Date | string | number): number;
/** {ano, mes} (mes 1-12) do calendário de Brasília — pra colunas ano/mês. */
export declare function anoMesBRT(d?: Date | string | number): {
    ano: number;
    mes: number;
};
/** "dd/mm/aaaa" no dia de Brasília. Aceita Date, epoch ou string local BR. */
export declare function formatarDataBR(d: Date | string | number): string;
/** "dd/mm/aaaa HH:mm" no horário de Brasília. */
export declare function formatarDataHoraBR(d: Date | string | number): string;
//# sourceMappingURL=date.d.ts.map