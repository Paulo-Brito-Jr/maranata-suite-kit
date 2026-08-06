import {
  maranataKeyStartUrl,
  type SsoUrlOptions,
  type VerifyTokenOptions,
  verifyMaranataKeyToken,
} from "@paulo-brito-jr/maranata-suite-kit/sso";

const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

const ibmStartOptions: SsoUrlOptions<"ibm"> = {
  codeChallenge,
  codeChallengeMethod: "S256",
};
const ibmVerifyOptions: VerifyTokenOptions<"ibm"> = {
  app: "ibm",
  codeVerifier,
};

// IBM: PKCE S256 e o vínculo ao app são parte obrigatória do contrato.
maranataKeyStartUrl("ibm", "https://ibm.maranata.app/api/sso/finish", {
  ...ibmStartOptions,
});
void verifyMaranataKeyToken("ticket-ibm", ibmVerifyOptions);

// @ts-expect-error O tipo IBM não admite options sem challenge/método.
const ibmStartSemPkce: SsoUrlOptions<"ibm"> = {};

// @ts-expect-error O tipo IBM não admite options sem verifier.
const ibmVerifySemPkce: VerifyTokenOptions<"ibm"> = { app: "ibm" };

void ibmStartSemPkce;
void ibmVerifySemPkce;

// @ts-expect-error IBM nunca inicia SSO sem PKCE.
maranataKeyStartUrl("ibm", "https://ibm.maranata.app/api/sso/finish");

maranataKeyStartUrl("ibm", "https://ibm.maranata.app/api/sso/finish", {
  codeChallenge,
  // @ts-expect-error O contrato IBM aceita apenas o método S256.
  codeChallengeMethod: "plain",
});

// @ts-expect-error A verificação IBM exige o verifier correspondente.
void verifyMaranataKeyToken("ticket-ibm", { app: "ibm" });

// @ts-expect-error A API TypeScript é camelCase; snake_case existe apenas no wire.
void verifyMaranataKeyToken("ticket-ibm", { app: "ibm", code_verifier: codeVerifier });

// @ts-expect-error A API TypeScript é camelCase; snake_case existe apenas no wire.
maranataKeyStartUrl("ibm", "https://ibm.maranata.app/api/sso/finish", { code_challenge: codeChallenge, code_challenge_method: "S256" });

// Consumidores legados continuam sem PKCE obrigatório.
maranataKeyStartUrl("agenda", "https://agenda.maranata.app/api/sso/finish");
void verifyMaranataKeyToken("ticket-agenda", { app: "agenda" });
void verifyMaranataKeyToken("ticket-legado");
