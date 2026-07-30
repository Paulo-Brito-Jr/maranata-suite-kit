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

export const BRT_TZ = "America/Sao_Paulo";
const BRT_OFFSET = "-03:00";

/** Detecta timezone explícito no fim da string: "Z", "+HH:MM", "-HH:MM", "+HHMM" ou "-HHMM". */
const TZ_SUFFIX_RE = /[zZ]$|[+-]\d{2}:?\d{2}$/;

/**
 * Interpreta "YYYY-MM-DDTHH:mm[:ss[.sss]]" (formato do input datetime-local,
 * sem timezone) como hora de Brasília. Strings que já vêm com timezone
 * explícito (Z ou offset +/-HH:mm) passam direto pro `new Date()` nativo —
 * não reinterpreta o que já é inequívoco.
 */
export function parseDataHoraBRT(s: string): Date {
  const trimmed = s.trim();
  if (TZ_SUFFIX_RE.test(trimmed)) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}${BRT_OFFSET}`);
}

/** Início do dia BRT (00:00:00.000) de uma string "YYYY-MM-DD". */
export function inicioDoDiaBRT(s: string): Date {
  return parseDataHoraBRT(`${s.trim()}T00:00:00`);
}

/** Fim do dia BRT (23:59:59.999) de uma string "YYYY-MM-DD". */
export function fimDoDiaBRT(s: string): Date {
  return parseDataHoraBRT(`${s.trim()}T23:59:59.999`);
}

const BRT_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: BRT_TZ,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function partsBRT(d: Date): { hora: number; minuto: number; diaSemana: number } {
  const parts = BRT_PARTS_FORMATTER.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const horaRaw = get("hour");
  // Alguns runtimes devolvem "24" pra meia-noite com hour12:false — normaliza pra 0.
  const hora = horaRaw === "24" ? 0 : parseInt(horaRaw, 10);
  const minuto = parseInt(get("minute"), 10);
  const diaSemana = WEEKDAY_INDEX[get("weekday")] ?? 0;
  return { hora, minuto, diaSemana };
}

/** Hora (0-23) de um Date no fuso BRT, via Intl — equivalente a getHours() mas em America/Sao_Paulo. */
export function horaBRT(d: Date): number {
  return partsBRT(d).hora;
}

/** Minuto (0-59) de um Date no fuso BRT, via Intl — equivalente a getMinutes() mas em America/Sao_Paulo. */
export function minutoBRT(d: Date): number {
  return partsBRT(d).minuto;
}

/** Dia-da-semana (0=domingo) de um Date no fuso BRT, via Intl — equivalente a getDay() mas em America/Sao_Paulo. */
export function diaSemanaBRT(d: Date): number {
  return partsBRT(d).diaSemana;
}

const BRT_DATA_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BRT_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const BRT_HORA_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BRT_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const BRT_ISO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Data no formato brasileiro "dd/mm/aaaa", sempre em BRT.
 *
 * Substitui `d.toLocaleDateString("pt-BR")` — que, sem `timeZone`, usa o fuso
 * do servidor (UTC na Vercel) e mostra o dia seguinte para qualquer horário
 * a partir das 21h de Brasília.
 */
export function formatarDataBRT(d: Date): string {
  return BRT_DATA_FORMATTER.format(d);
}

/** Data e hora "dd/mm/aaaa HH:mm", sempre em BRT. */
export function formatarDataHoraBRT(d: Date): string {
  return `${BRT_DATA_FORMATTER.format(d)} ${BRT_HORA_FORMATTER.format(d)}`;
}

/**
 * Data no formato ISO "YYYY-MM-DD" **do dia em BRT** — o valor que um
 * `<input type="date">` espera.
 *
 * Diferente de `d.toISOString().slice(0, 10)`, que devolve o dia em UTC e
 * portanto erra a partir das 21h de Brasília. É a volta de `inicioDoDiaBRT`.
 */
export function dataISOBRT(d: Date): string {
  return BRT_ISO_FORMATTER.format(d);
}
