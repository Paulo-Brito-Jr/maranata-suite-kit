import type { MembershipApp } from "./membership.js";
export type AppSwitcherProps = {
    /** Apps do membro — de `fetchMembershipApps` (`./membership`) ou `catalogAsApps` (`./fallback`). */
    apps: MembershipApp[];
    /** Slug do app atual: ganha checkmark e não abre em nova aba. */
    currentSlug?: string | null;
    className?: string;
};
/**
 * Dropdown do app switcher da Suite Maranata.
 *
 * Puramente apresentacional — zero fetch interno, zero dependência do host
 * além de `react` (peer). Segue o padrão "button cru + Tailwind" (variante
 * mais completa hoje em rodizio-maranata/components/layout/app-switcher.tsx:
 * CURRENT + checkmark), sem importar `@/components/ui/*` de nenhum host —
 * assim funciona igual nos ~10 apps da Suite, cada um com config de shadcn
 * própria (ou nenhuma).
 *
 * Ícone/cor vêm do catálogo local por slug (`./catalog`, emoji/char — nunca
 * lib de ícones tipo lucide) com fallback pra inicial do nome quando o slug
 * não está (ainda) no catálogo sincronizado.
 */
export declare function AppSwitcher({ apps, currentSlug, className }: AppSwitcherProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=app-switcher.d.ts.map