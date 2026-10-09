// AppSwitcher — contrato visual e de acessibilidade, sem dependência nova.
//
// O pacote não instala `react` (peer opcional) nem tem framework de render.
// Por isso o teste troca `react` e `react/jsx-runtime` por um stub mínimo
// (hooks determinísticos + árvore de elementos como objetos) via loader hook
// e chama o componente de `dist/` direto. Cobre estrutura, classes, aria,
// clique, Esc e foco; o resto (layout real) é conferido nos apps consumidores.
// Roda contra dist/: `pnpm build && node --test scripts/app-switcher.test.mjs`.
import assert from "node:assert/strict";
import { register } from "node:module";
import { beforeEach, describe, it } from "node:test";

const reactStub = `
const f = globalThis.__fake;
export const useState = (init) => f.useState(init);
export const useRef = (init) => f.useRef(init);
export const useEffect = (fn, deps) => f.useEffect(fn, deps);
export default { useState, useRef, useEffect };
`;
const runtimeStub = `
export const Fragment = Symbol.for("fragment");
export const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
export const jsxs = jsx;
`;
const hooks = `
const stubs = {
  react: ${JSON.stringify("data:text/javascript," + encodeURIComponent(reactStub))},
  "react/jsx-runtime": ${JSON.stringify("data:text/javascript," + encodeURIComponent(runtimeStub))},
};
export async function resolve(specifier, context, next) {
  if (stubs[specifier]) return { url: stubs[specifier], shortCircuit: true };
  return next(specifier, context);
}
`;
register("data:text/javascript," + encodeURIComponent(hooks), import.meta.url);

// Estado fake: valores persistem entre renders por ordem de chamada.
const fake = (globalThis.__fake = {
  states: [],
  refs: [],
  effects: [],
  i: 0,
  r: 0,
  reset() {
    this.states = [];
    this.refs = [];
    this.effects = [];
    this.i = 0;
    this.r = 0;
  },
  useState(init) {
    const idx = this.i++;
    if (!(idx in this.states)) this.states[idx] = init;
    const set = (v) => {
      this.states[idx] = typeof v === "function" ? v(this.states[idx]) : v;
    };
    return [this.states[idx], set];
  },
  useRef(init) {
    const idx = this.r++;
    if (!(idx in this.refs)) this.refs[idx] = { current: init };
    return this.refs[idx];
  },
  useEffect(fn, deps) {
    this.effects.push({ fn, deps });
  },
});

const { AppSwitcher } = await import("../dist/app-switcher.js");

const APPS = [
  { slug: "rodizio", nome: "Rodízio", url: "https://rodizio.maranata.app", papel: "COORDENADOR", via: "direct" },
  { slug: "escala", nome: "Escala", url: "https://escala.maranata.app", papel: "USUARIO", via: "direct" },
  { slug: "novo-sem-catalogo", nome: "zeta", url: "https://zeta.example.test", papel: "ACESSO", via: "direct" },
];

function render(props) {
  fake.i = 0;
  fake.r = 0;
  fake.effects = [];
  return AppSwitcher(props);
}

const kids = (el) => {
  const c = el?.props?.children;
  return (Array.isArray(c) ? c.flat(Infinity) : [c]).filter((x) => x && typeof x === "object");
};
function walk(el, fn) {
  if (!el || typeof el !== "object") return;
  fn(el);
  kids(el).forEach((k) => walk(k, fn));
}
function all(el, pred) {
  const out = [];
  walk(el, (n) => pred(n) && out.push(n));
  return out;
}
const text = (el) => {
  let s = "";
  walk(el, (n) => {
    const c = n.props?.children;
    for (const x of Array.isArray(c) ? c.flat(Infinity) : [c]) if (typeof x === "string") s += x;
  });
  return s;
};
const classes = (el) => all(el, (n) => typeof n.props.className === "string").map((n) => n.props.className);

beforeEach(() => fake.reset());

describe("AppSwitcher (idioma Apple)", () => {
  it("não renderiza nada sem apps", () => {
    assert.equal(render({ apps: [] }), null);
  });

  it("fechado: só o botão, filho direto da raiz (contrato dos consumidores)", () => {
    const root = render({ apps: APPS, currentSlug: "rodizio", className: "ml-2" });
    assert.equal(root.type, "div");
    assert.match(root.props.className, /\brelative\b/);
    assert.match(root.props.className, /\bml-2\b/);
    const filhos = kids(root);
    assert.equal(filhos.length, 1, "menu fechado não monta o popover");
    const btn = filhos[0];
    assert.equal(btn.type, "button");
    assert.equal(btn.props.type, "button");
    assert.equal(btn.props["aria-expanded"], false);
    assert.equal(btn.props["aria-haspopup"], "menu");
    assert.match(btn.props["aria-label"], /^Apps/, "o nome acessível contém o rótulo visível");
  });

  it("botão: sem borda dura, sem emoji, ícone SVG inline aria-hidden de 16 px e rótulo 'Apps' a partir de sm", () => {
    const btn = kids(render({ apps: APPS }))[0];
    const cls = btn.props.className;
    assert.doesNotMatch(cls, /(^|\s)border(\s|$)|border-border/);
    assert.match(cls, /\brounded-full\b/);
    assert.match(cls, /\bhover:bg-muted\b/);
    assert.match(cls, /focus-visible:ring-2/);
    assert.doesNotMatch(text(btn), /🔀/);
    const [svg] = all(btn, (n) => n.type === "svg");
    assert.ok(svg, "ícone SVG presente");
    assert.equal(svg.props["aria-hidden"], true);
    assert.equal(svg.props.width, "16");
    assert.equal(svg.props.height, "16");
    assert.equal(all(svg, (n) => n.type === "rect").length, 4, "grade 2x2");
    const [label] = all(btn, (n) => n.type === "span");
    assert.equal(text(label), "Apps");
    assert.match(label.props.className, /\bhidden\b.*\bsm:inline\b/);
  });

  it("clique no botão abre e fecha; aria-expanded acompanha", () => {
    let root = render({ apps: APPS });
    kids(root)[0].props.onClick();
    root = render({ apps: APPS });
    assert.equal(kids(root)[0].props["aria-expanded"], true);
    assert.equal(kids(root).length, 2);
    kids(root)[0].props.onClick();
    root = render({ apps: APPS });
    assert.equal(kids(root)[0].props["aria-expanded"], false);
    assert.equal(kids(root).length, 1);
  });

  describe("aberto", () => {
    function aberto(currentSlug = "rodizio") {
      render({ apps: APPS, currentSlug });
      fake.states[0] = true;
      return render({ apps: APPS, currentSlug });
    }

    it("popover sólido com hairline, sombra leve, raio 16 e um item de 44 px por app", () => {
      const root = aberto();
      const [menu] = all(root, (n) => n.props.role === "menu");
      assert.ok(menu);
      assert.match(menu.props.className, /\bbg-popover\b/);
      assert.match(menu.props.className, /\bring-1\b/);
      assert.match(menu.props.className, /\bring-border\b/);
      assert.match(menu.props.className, /\bshadow-md\b/);
      assert.match(menu.props.className, /\brounded-2xl\b/);
      assert.doesNotMatch(menu.props.className, /shadow-lg|(^|\s)border(\s|$)/);
      const itens = all(root, (n) => n.props.role === "menuitem");
      assert.equal(itens.length, APPS.length);
      for (const it of itens) assert.match(it.props.className, /\bmin-h-11\b/);
    });

    it("cabeçalho e papéis em caixa de frase (sem uppercase nem tracking largo)", () => {
      const root = aberto("escala");
      const t = text(root);
      assert.match(t, /Suite Maranata/);
      assert.match(t, /Coordenador/);
      assert.match(t, /Acesso/);
      assert.doesNotMatch(classes(root).join(" "), /uppercase|tracking-wide|tracking-widest|text-\[10px\]/);
    });

    it("app atual: aria-current, 'App atual', checkmark e abre na mesma aba; os demais em nova aba segura", () => {
      const itens = all(aberto(), (n) => n.props.role === "menuitem");
      const atual = itens.find((n) => n.props.href.includes("rodizio"));
      assert.equal(atual.props["aria-current"], "page");
      assert.equal(atual.props.target, undefined);
      assert.equal(atual.props.rel, undefined);
      assert.match(text(atual), /App atual/);
      assert.equal(all(atual, (n) => n.type === "svg").length, 1, "checkmark");
      const outro = itens.find((n) => n.props.href.includes("escala"));
      assert.equal(outro.props["aria-current"], undefined);
      assert.equal(outro.props.target, "_blank");
      assert.equal(outro.props.rel, "noopener noreferrer");
      assert.equal(all(outro, (n) => n.type === "svg").length, 0);
    });

    it("slug fora do catálogo cai na inicial do nome", () => {
      const itens = all(aberto(), (n) => n.props.role === "menuitem");
      const novo = itens.find((n) => n.props.href.includes("zeta"));
      const [icone] = all(novo, (n) => n.type === "span" && n.props["aria-hidden"]);
      assert.equal(text(icone), "Z");
    });

    it("clicar num item fecha o menu", () => {
      const itens = all(aberto(), (n) => n.props.role === "menuitem");
      itens[1].props.onClick();
      const root = render({ apps: APPS, currentSlug: "rodizio" });
      assert.equal(kids(root).length, 1);
    });

    it("Esc fecha e devolve o foco ao botão", () => {
      const handlers = {};
      globalThis.document = {
        addEventListener: (t, h) => (handlers[t] = h),
        removeEventListener() {},
      };
      try {
        const root = aberto();
        let focado = 0;
        // ref do botão é a 2ª ref criada (raiz = 0, botão = 1, focusOnOpen = 2).
        fake.refs[1].current = { focus: () => focado++ };
        assert.equal(kids(root)[0].props.ref, fake.refs[1]);
        const efeitoDeFechar = fake.effects[0];
        efeitoDeFechar.fn();
        assert.ok(handlers.keydown, "listener de teclado registrado enquanto aberto");
        handlers.keydown({ key: "a" });
        assert.equal(fake.states[0], true, "outras teclas não fecham");
        handlers.keydown({ key: "Escape" });
        assert.equal(fake.states[0], false);
        assert.equal(focado, 1, "foco volta ao botão");
      } finally {
        delete globalThis.document;
      }
    });

    it("ArrowDown no botão fechado abre e pede foco no primeiro item", () => {
      const root = render({ apps: APPS });
      const btn = kids(root)[0];
      fake.refs[1].current = btn;
      let prevented = false;
      root.props.onKeyDown({ key: "ArrowDown", target: btn, preventDefault: () => (prevented = true) });
      assert.equal(prevented, true);
      assert.equal(fake.states[0], true);
      assert.equal(fake.refs[2].current, "first");
    });
  });

  it("usa só classes de cor semânticas que todos os apps da Suite definem", () => {
    render({ apps: APPS });
    fake.states[0] = true;
    const root = render({ apps: APPS, currentSlug: "rodizio" });
    const permitidas = new Set([
      "background", "foreground", "muted", "muted-foreground", "popover",
      "popover-foreground", "border", "accent", "ring", "transparent",
    ]);
    const medida = /^(xs|sm|base|lg|xl|\d+(\.\d+)?|inset)$/;
    const fora = [];
    for (const cls of classes(root)) {
      for (const token of cls.split(/\s+/).filter(Boolean)) {
        const base = token.split(":").pop();
        const m = /^(bg|text|ring|border|fill|stroke)-(.+)$/.exec(base);
        if (!m) continue;
        const nome = m[2].replace(/\/\d+$/, "");
        if (medida.test(nome) || /^\[.*\]$/.test(nome)) continue;
        if (m[1] === "fill" && nome === "current") continue;
        if (!permitidas.has(nome)) fora.push(token);
      }
    }
    assert.deepEqual(fora, [], "classes de cor fora do conjunto semântico comum");
  });
});
