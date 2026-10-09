"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { MARANATA_SUITE_CATALOG } from "./catalog.js";
import type { MembershipApp } from "./membership.js";

export type AppSwitcherProps = {
  /** Apps da conta — de `fetchMembershipApps` (`./membership`) ou `catalogAsApps` (`./fallback`). */
  apps: MembershipApp[];
  /** Slug do app atual: ganha checkmark e não abre em nova aba. */
  currentSlug?: string | null;
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function initial(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || "?";
}

/** "COORDENADOR" -> "Coordenador" (caixa de frase, sem uppercase por CSS). */
function sentenceCase(texto: string): string {
  const t = texto.trim().toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

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
export function AppSwitcher({ apps, currentSlug, className }: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Quando o menu abre pelo teclado, o foco entra no primeiro/último item.
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    const itens = ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    if (itens && itens.length > 0) {
      (focusOnOpen.current === "last" ? itens[itens.length - 1] : itens[0])?.focus();
    }
    focusOnOpen.current = null;
  }, [open]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") {
      if (open) setOpen(false);
      return;
    }
    const isArrow = e.key === "ArrowDown" || e.key === "ArrowUp";
    if (!open) {
      if (isArrow && e.target === buttonRef.current) {
        e.preventDefault();
        focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
        setOpen(true);
      }
      return;
    }
    if (!isArrow && e.key !== "Home" && e.key !== "End") return;
    const itens = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (itens.length === 0) return;
    e.preventDefault();
    const atual = itens.indexOf(document.activeElement as HTMLElement);
    let proximo: number;
    if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = itens.length - 1;
    else if (e.key === "ArrowDown") proximo = atual < 0 ? 0 : (atual + 1) % itens.length;
    else proximo = atual <= 0 ? itens.length - 1 : atual - 1;
    itens[proximo]?.focus();
  }

  if (apps.length === 0) return null;

  return (
    <div ref={ref} className={cx("relative", className)} onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          // Clique/toque não move o foco pro menu; só o teclado (setas) faz isso.
          focusOnOpen.current = null;
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Apps, trocar de app"
        title="Trocar de app"
        className={cx(
          "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open ? "bg-muted text-foreground" : "bg-transparent text-muted-foreground",
        )}
      >
        <svg
          aria-hidden
          focusable="false"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          className="size-4 shrink-0 fill-current"
        >
          <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" />
          <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" />
          <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" />
          <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" />
        </svg>
        <span className="hidden sm:inline">Apps</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Apps da Suite Maranata"
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-border"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
            Suite Maranata
          </p>
          {apps.map((app) => {
            const isCurrent = app.slug === currentSlug;
            const catalogEntry = MARANATA_SUITE_CATALOG[app.slug];
            const icon = catalogEntry?.icon ?? initial(app.nome);
            const cor = catalogEntry?.cor ?? "#64748b";

            return (
              <a
                key={app.slug}
                href={app.url}
                target={isCurrent ? undefined : "_blank"}
                rel={isCurrent ? undefined : "noopener noreferrer"}
                role="menuitem"
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ backgroundColor: `${cor}1a`, color: cor }}
                >
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {app.nome}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {isCurrent ? "App atual" : sentenceCase(app.papel)}
                  </span>
                </span>
                {isCurrent && (
                  <svg
                    aria-hidden
                    focusable="false"
                    viewBox="0 0 16 16"
                    className="size-4 shrink-0 fill-current text-foreground"
                  >
                    <path d="M13.7 4.3a1 1 0 0 1 0 1.4l-6.5 6.5a1 1 0 0 1-1.4 0L2.3 8.7a1 1 0 1 1 1.4-1.4L6.5 10l5.8-5.8a1 1 0 0 1 1.4 0Z" />
                  </svg>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
