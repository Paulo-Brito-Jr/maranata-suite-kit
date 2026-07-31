// Testes do módulo de SSO — roda contra dist/ já buildado via self-reference
// do pacote (`node --test`, sem framework, igual aos demais scripts/*.test.mjs
// deste repo): `pnpm build && node --test scripts/sso.test.mjs`.
//
// O foco é a resolução de host e o fail-soft do verify: são exatamente os dois
// pontos onde as 7 cópias divergiam entre si.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  DEFAULT_KEY_AUTH_URL,
  MARANATA_KEY_PORTAL_URL,
  maranataKeyBaseUrl,
  maranataKeyLogoutUrl,
  maranataKeyStartUrl,
  verifyMaranataKeyToken,
} from "@paulo-brito-jr/maranata-suite-kit/sso";

const ENVS = ["MARANATA_KEY_AUTH_URL", "MARANATA_KEY_URL"];

afterEach(() => {
  for (const k of ENVS) delete process.env[k];
});

// ---------------------------------------------------------------------------
// Resolução de host — o defeito original
// ---------------------------------------------------------------------------

test("baseUrl: sem env nenhuma, cai no host canônico", () => {
  assert.equal(maranataKeyBaseUrl(), "https://key.maranata.app");
  assert.equal(DEFAULT_KEY_AUTH_URL, "https://key.maranata.app");
});

test("baseUrl: MARANATA_KEY_AUTH_URL vence o default", () => {
  process.env.MARANATA_KEY_AUTH_URL = "https://auth.maranata.app";
  assert.equal(maranataKeyBaseUrl(), "https://auth.maranata.app");
});

test("baseUrl: MARANATA_KEY_URL (descontinuada) NÃO é lida", () => {
  // Regressão do caso festa-amor: a env antiga apontava pro domínio de deploy
  // da Vercel. Se um dia alguém a reintroduzir num .env, ela deve ser inerte.
  process.env.MARANATA_KEY_URL = "https://maranata-key.vercel.app";
  assert.equal(maranataKeyBaseUrl(), "https://key.maranata.app");
});

test("baseUrl: argumento explícito vence a env", () => {
  process.env.MARANATA_KEY_AUTH_URL = "https://auth.maranata.app";
  assert.equal(maranataKeyBaseUrl("https://key-preview.example"), "https://key-preview.example");
});

test("baseUrl: barra final é removida (não gera //api)", () => {
  process.env.MARANATA_KEY_AUTH_URL = "https://key.maranata.app/";
  assert.equal(maranataKeyBaseUrl(), "https://key.maranata.app");
  assert.ok(maranataKeyStartUrl("agenda", "https://agenda.maranata.app").includes("/api/sso/start"));
  assert.ok(!maranataKeyStartUrl("agenda", "https://agenda.maranata.app").includes("//api/"));
});

test("baseUrl: env vazia ou só espaços cai no default", () => {
  process.env.MARANATA_KEY_AUTH_URL = "   ";
  assert.equal(maranataKeyBaseUrl(), "https://key.maranata.app");
});

test("portal e host de API são constantes distintas", () => {
  // Hoje coincidem; o teste existe para que separá-los no futuro seja uma
  // mudança consciente e não uma quebra silenciosa de quem usa o portal.
  assert.equal(typeof MARANATA_KEY_PORTAL_URL, "string");
  assert.ok(MARANATA_KEY_PORTAL_URL.startsWith("https://"));
});

// ---------------------------------------------------------------------------
// Montagem das URLs do handshake
// ---------------------------------------------------------------------------

test("startUrl: monta app + return, e omite mode='mk' (default do Key)", () => {
  const u = new URL(maranataKeyStartUrl("agenda", "https://agenda.maranata.app/painel"));
  assert.equal(u.pathname, "/api/sso/start");
  assert.equal(u.searchParams.get("app"), "agenda");
  assert.equal(u.searchParams.get("return"), "https://agenda.maranata.app/painel");
  assert.equal(u.searchParams.get("mode"), null);
  assert.equal(u.searchParams.get("force"), null);

  const comMk = new URL(maranataKeyStartUrl("agenda", "https://x.example", { mode: "mk" }));
  assert.equal(comMk.searchParams.get("mode"), null);
});

test("startUrl: mode não-default e force viram query", () => {
  const u = new URL(
    maranataKeyStartUrl("pastoral", "https://pastoral.maranata.app", { mode: "otp", force: true }),
  );
  assert.equal(u.searchParams.get("mode"), "otp");
  assert.equal(u.searchParams.get("force"), "1");
});

test("startUrl: returnUrl com query própria é preservada inteira", () => {
  const ret = "https://escala.maranata.app/e?igreja=7&mes=2026-08";
  const u = new URL(maranataKeyStartUrl("escala", ret));
  assert.equal(u.searchParams.get("return"), ret);
});

test("logoutUrl: mesmo par app/return, path de logout", () => {
  const u = new URL(maranataKeyLogoutUrl("financeiro", "https://financeiro.maranata.app"));
  assert.equal(u.pathname, "/api/sso/logout");
  assert.equal(u.searchParams.get("app"), "financeiro");
  assert.equal(u.searchParams.get("return"), "https://financeiro.maranata.app");
});

// ---------------------------------------------------------------------------
// verify — fail-soft (o contrato que as 7 cópias já tinham)
// ---------------------------------------------------------------------------

const okUser = { sub: "u1", email: "a@b.c", name: "Fulano" };

function fetchFake(resposta) {
  return async () => resposta;
}

test("verify: valid:true devolve o user", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: fetchFake({ ok: true, json: async () => ({ valid: true, user: okUser }) }),
  });
  assert.deepEqual(u, okUser);
});

test("verify: valid:false devolve null", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: fetchFake({ ok: true, json: async () => ({ valid: false }) }),
  });
  assert.equal(u, null);
});

test("verify: valid:true sem user devolve null", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: fetchFake({ ok: true, json: async () => ({ valid: true }) }),
  });
  assert.equal(u, null);
});

test("verify: HTTP não-ok devolve null", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: fetchFake({ ok: false, json: async () => ({ valid: true, user: okUser }) }),
  });
  assert.equal(u, null);
});

test("verify: corpo malformado devolve null em vez de lançar", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: fetchFake({
      ok: true,
      json: async () => {
        throw new SyntaxError("not json");
      },
    }),
  });
  assert.equal(u, null);
});

test("verify: erro de rede devolve null em vez de lançar", async () => {
  const u = await verifyMaranataKeyToken("t", {
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(u, null);
});

test("verify: timeout aborta e devolve null (as cópias antigas não tinham teto)", async () => {
  const u = await verifyMaranataKeyToken("t", {
    timeoutMs: 20,
    fetchImpl: (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
  });
  assert.equal(u, null);
});

test("verify: POST no /api/auth/verify do host resolvido, com o token no corpo", async () => {
  process.env.MARANATA_KEY_AUTH_URL = "https://auth.maranata.app";
  let visto = null;
  await verifyMaranataKeyToken("token-abc", {
    fetchImpl: async (url, init) => {
      visto = { url, init };
      return { ok: true, json: async () => ({ valid: true, user: okUser }) };
    },
  });
  assert.equal(visto.url, "https://auth.maranata.app/api/auth/verify");
  assert.equal(visto.init.method, "POST");
  assert.equal(visto.init.cache, "no-store");
  assert.deepEqual(JSON.parse(visto.init.body), { token: "token-abc" });
});
