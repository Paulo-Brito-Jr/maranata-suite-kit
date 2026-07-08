// Smoke test manual — sem framework (zero deps além de typescript/@types/react).
// Roda contra dist/ já buildado: `npm run build && npm run smoke`.
import assert from "node:assert/strict";

import { canonicalAppUrl, MARANATA_SUITE_CATALOG } from "../dist/catalog.js";
import { catalogAsApps } from "../dist/fallback.js";

// 1. canonicalAppUrl: a URL do catálogo SEMPRE vence sobre uma URL "de
//    banco" (ex: um .vercel.app velho preso em algum registro antigo).
{
  const urlDeBancoVelha = "https://rodizio-maranata.vercel.app";
  const resolved = canonicalAppUrl("rodizio", urlDeBancoVelha);
  assert.equal(resolved, MARANATA_SUITE_CATALOG.rodizio.url, "catálogo deveria vencer o .vercel.app");
  assert.notEqual(resolved, urlDeBancoVelha, "não deveria devolver o .vercel.app de banco");
  console.log("[smoke] canonicalAppUrl: catálogo vence sobre .vercel.app de banco — OK");
}

// 2. slug desconhecido cai pro fallbackUrl informado (app novo, ainda não
//    sincronizado no catálogo local).
{
  const desconhecido = canonicalAppUrl("app-que-nao-existe-ainda", "https://exemplo.com/app");
  assert.equal(desconhecido, "https://exemplo.com/app", "slug desconhecido deveria usar o fallback");
  const semFallback = canonicalAppUrl("app-que-nao-existe-ainda", null);
  assert.equal(semFallback, null, "sem fallback e slug desconhecido deveria ser null");
  console.log("[smoke] canonicalAppUrl: slug desconhecido usa fallback (ou null) — OK");
}

// 3. catalogAsApps: converte o catálogo estático em MembershipApp[] válido,
//    com a URL canônica e papel/via default de fallback.
{
  const apps = catalogAsApps("rodizio");
  const totalCatalogo = Object.keys(MARANATA_SUITE_CATALOG).length;
  assert.ok(Array.isArray(apps) && apps.length === totalCatalogo, "deveria ter 1 entrada por app do catálogo");

  const rodizioApp = apps.find((a) => a.slug === "rodizio");
  assert.ok(rodizioApp, "rodizio deveria estar na lista de fallback");
  assert.equal(rodizioApp.papel, "USUARIO");
  assert.equal(rodizioApp.via, "direct");
  assert.equal(rodizioApp.url, MARANATA_SUITE_CATALOG.rodizio.url);
  console.log("[smoke] catalogAsApps: shape + URL canônica — OK");
}

console.log("\n[smoke] tudo verde.");
