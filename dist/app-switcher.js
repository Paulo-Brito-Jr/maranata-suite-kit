"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { MARANATA_SUITE_CATALOG } from "./catalog.js";
function cx(...parts) {
    return parts.filter(Boolean).join(" ");
}
function initial(nome) {
    return nome.trim().charAt(0).toUpperCase() || "?";
}
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
export function AppSwitcher({ apps, currentSlug, className }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        function onClick(e) {
            if (ref.current && !ref.current.contains(e.target))
                setOpen(false);
        }
        function onKey(e) {
            if (e.key === "Escape")
                setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    if (apps.length === 0)
        return null;
    return (_jsxs("div", { ref: ref, className: cx("relative", className), children: [_jsxs("button", { type: "button", onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu", title: "Trocar de app", className: "inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", children: [_jsx("span", { "aria-hidden": true, className: "leading-none", children: "\uD83D\uDD00" }), _jsx("span", { className: "hidden sm:inline", children: "Apps" })] }), open && (_jsxs("div", { role: "menu", className: "absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-2 shadow-lg ring-1 ring-foreground/5", children: [_jsx("p", { className: "px-2 pb-1 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground", children: "Suite Maranata" }), apps.map((app) => {
                        const isCurrent = app.slug === currentSlug;
                        const catalogEntry = MARANATA_SUITE_CATALOG[app.slug];
                        const icon = catalogEntry?.icon ?? initial(app.nome);
                        const cor = catalogEntry?.cor ?? "#64748b";
                        return (_jsxs("a", { href: app.url, target: isCurrent ? undefined : "_blank", rel: isCurrent ? undefined : "noopener noreferrer", role: "menuitem", onClick: () => setOpen(false), className: cx("flex items-center gap-2 rounded-md px-2 py-2 transition-colors", isCurrent ? "bg-muted" : "hover:bg-muted"), children: [_jsx("span", { "aria-hidden": true, className: "flex size-6 shrink-0 items-center justify-center rounded-md text-sm", style: { backgroundColor: `${cor}1a`, color: cor }, children: icon }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-sm font-medium text-foreground", children: [_jsx("span", { className: "truncate", children: app.nome }), isCurrent && (_jsx("svg", { "aria-hidden": true, viewBox: "0 0 16 16", className: "size-3 shrink-0 fill-current", children: _jsx("path", { d: "M13.7 4.3a1 1 0 0 1 0 1.4l-6.5 6.5a1 1 0 0 1-1.4 0L2.3 8.7a1 1 0 1 1 1.4-1.4L6.5 10l5.8-5.8a1 1 0 0 1 1.4 0Z" }) }))] }), _jsx("span", { className: "block text-[10px] uppercase tracking-wide text-muted-foreground", children: isCurrent ? "app atual" : app.papel.toLowerCase() })] })] }, app.slug));
                    })] }))] }));
}
//# sourceMappingURL=app-switcher.js.map