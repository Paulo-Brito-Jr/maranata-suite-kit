import type { MembershipApp } from "./membership.js";
export type AppSwitcherProps = {
    /** Apps da conta — de `fetchMembershipApps` (`./membership`) ou `catalogAsApps` (`./fallback`). */
    apps: MembershipApp[];
    /** Slug do app atual: ganha checkmark e não abre em nova aba. */
    currentSlug?: string | null;
    className?: string;
};
/**
 * Dropdown do app switcher da Suite Maranata (idioma Apple).
 *
 * Puramente apresentacional — zero fetch interno, zero dependência do host
 * além de `react` (peer). Sem `@/components/ui/*` e sem lib de ícones: o
 * ícone do botão é um SVG inline (grade 2x2) e o de cada app vem do catálogo
 * local por slug (`./catalog`, emoji/char) com fallback pra inicial do nome.
 *
 * Só usa classes semânticas que TODOS os apps da Suite definem (background,
 * foreground, muted, muted-foreground, popover, popover-foreground, border,
 * accent, ring) — nada de tokens que só existem nos apps Apple.
 *
 * Contrato de estrutura (consumidores dependem): o `<button>` é filho direto
 * da raiz, p.ex. `className="[&>button]:pointer-coarse:min-h-11"`.
 *
 * Teclado: Enter/Espaço/seta abrem; setas, Home e End percorrem os itens;
 * Esc fecha e devolve o foco ao botão; Tab fecha.
 */
export declare function AppSwitcher({ apps, currentSlug, className }: AppSwitcherProps): import("react").JSX.Element | null;
//# sourceMappingURL=app-switcher.d.ts.map