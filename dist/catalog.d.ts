/**
 * Catálogo canônico de apps da Suite Maranata.
 *
 * SNAPSHOT — a fonte de verdade é o maranata-key:
 *   /Users/paulobrito/dev/maranata-key/src/lib/maranata-suite.ts (MARANATA_SUITE_APPS)
 *
 * Qualquer app novo da Suite entra PRIMEIRO lá; este pacote é um espelho
 * read-only, só com os campos que o app-switcher e o fallback precisam
 * (slug/nome/url/icon/cor). Campos omitidos de propósito porque são
 * específicos do fluxo de SSO do maranata-key e não servem a este pacote:
 * `descricao`, `allowedOrigins`, `allowedReturnPaths`.
 *
 * Ao adicionar/mudar um app no maranata-key, resincronize esta tabela
 * manualmente (copiar os 5 campos) e suba um patch novo deste pacote.
 */
export type SuiteCatalogEntry = {
    slug: string;
    nome: string;
    /** URL canônica *.maranata.app — nunca um preview .vercel.app. */
    url: string;
    /** Emoji/char do app (sem lib de ícones — ver ./app-switcher). */
    icon: string;
    /** Cor de marca em hex, usada como acento no switcher. */
    cor: string;
};
export declare const MARANATA_SUITE_CATALOG: Record<string, SuiteCatalogEntry>;
/**
 * Resolve a URL canônica de um app pelo slug. SEMPRE prefere o catálogo
 * local (mata URL velha/preview `.vercel.app` que possa ter ficado presa
 * em algum registro de banco). Só usa `fallbackUrl` quando o slug é
 * desconhecido do catálogo (app novo que ainda não foi sincronizado aqui).
 */
export declare function canonicalAppUrl(slug: string, fallbackUrl?: string | null): string | null;
//# sourceMappingURL=catalog.d.ts.map