/**
 * Permissões granulares da Suite Maranata — helper de consumo.
 *
 * O Maranata Key (key.maranata.app) resolve as permissões efetivas de cada
 * membro por app/recurso/ação e as entrega em dois lugares:
 *
 *  1. No JWT do handshake SSO (`/api/sso/start` → `st`): o app alvo recebe
 *     `apps[<seu-slug>].perms = { <resourceSlug>: ["view","edit",...] }`.
 *  2. No `/api/membership/[email]` (server-to-server): campo `perms` completo
 *     `{ <appSlug>: { <resourceSlug>: [...] } }`.
 *
 * Camadas resolvidas pelo Key (o app cliente NÃO precisa recalcular):
 *   papel no app (ADMIN=tudo · USUARIO=view+create+edit · VIEWER=view)
 *   ∪ categorias (grupos) ∪ overrides individuais (deny vence tudo).
 * SUPER_ADMIN e DESENVOLVEDOR chegam com todas as ações em todos os recursos.
 */
/**
 * O membro pode executar `action` no recurso `resourceSlug`?
 * `manage` presente no recurso implica qualquer ação.
 *
 * Uso típico no app cliente (perms vindas do token SSO do próprio app):
 *   if (!can(sessao.perms, "eventos", "edit")) return forbidden();
 */
export function can(perms, resourceSlug, action) {
    const list = perms?.[resourceSlug];
    if (!list)
        return false;
    return list.includes(action) || list.includes("manage");
}
/** Variante para o shape completo por app (ex.: resposta de /api/membership). */
export function canInApp(perms, appSlug, resourceSlug, action) {
    return can(perms?.[appSlug], resourceSlug, action);
}
/** O membro tem alguma permissão no recurso? (útil pra esconder menus) */
export function canSee(perms, resourceSlug) {
    return (perms?.[resourceSlug]?.length ?? 0) > 0;
}
//# sourceMappingURL=permissions.js.map