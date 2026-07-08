#!/usr/bin/env bash
# .githooks/lib/frota-git-porteiro.sh
#
# Porteiro da Sincronia da Frota (F4). Roda no pre-push e BLOQUEIA pushes
# com sinais de problema antes de propagar pra frota:
#   1. delete em massa (>50 arquivos OU >2000 linhas removidas)
#   2. segredos (sk-ant-*, sk-proj-*, AKIA*, sk_live_*, ghp_*, BEGIN PRIVATE KEY...)
#   3. lixo (node_modules/, .next/, .DS_Store, .env/.env.*/exceto .env.example, *.log)
#
# Aplica direto a lição do bug do sync-vault — delete de 159 notas teria sido
# barrado aqui antes de propagar pra frota.
#
# Stdin: <local_ref> <local_sha> <remote_ref> <remote_sha> por ref (formato
# do git pre-push hook). Exit 0 = ok, 1 = bloqueia.
#
# Bypass: git push --no-verify (com aviso). Overridable:
#   SKYNET_PORTEIRO_DELETE_FILES_MAX (default 50)
#   SKYNET_PORTEIRO_DELETE_LINES_MAX (default 2000)
#   SKYNET_PORTEIRO_DISABLED=1   pra desligar por completo
#
# NÃO usa `set -o pipefail` — pipes com grep retornando 1 são caso normal
# (zero matches = sucesso). Cada comando que pode falhar tem `|| true` ou
# fallback explícito.

set -eu

[ "${SKYNET_PORTEIRO_DISABLED:-0}" = "1" ] && exit 0

ZERO=0000000000000000000000000000000000000000
DELETE_FILES_MAX="${SKYNET_PORTEIRO_DELETE_FILES_MAX:-50}"
DELETE_LINES_MAX="${SKYNET_PORTEIRO_DELETE_LINES_MAX:-2000}"

# Regex de segredos (ERE). Quantificadores amplos pra pegar variações.
# aws_secret_access_key exige contexto (= ou : seguido de valor com >=16
# chars base64-ish) pra não disparar em menção literal da string (ex: a
# própria regex deste arquivo, docs, comentários).
SECRET_REGEX='sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|sk_live_[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|aws_secret_access_key[[:space:]]*[=:][[:space:]]*"?[A-Za-z0-9/+]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----'

bloqueios=()

eh_lixo() {
  case "$1" in
    node_modules|node_modules/*|*/node_modules/*) return 0 ;;
    .next|.next/*|*/.next/*) return 0 ;;
    *.log) return 0 ;;
    .DS_Store|*/.DS_Store) return 0 ;;
    .env.example|*/.env.example) return 1 ;;
    .env|.env.local|.env.production|.env.development|.env.preview) return 0 ;;
    .env.*|*/.env.*) return 0 ;;
    *) return 1 ;;
  esac
}

contar_linhas() {
  # `wc -l` portátil; remove whitespace.
  printf '%s' "$1" | grep -c '^' 2>/dev/null || true
}

while read -r local_ref local_sha remote_ref remote_sha || [ -n "${local_sha:-}" ]; do
  # Skip linha vazia / refs incompletas.
  [ -z "${local_sha:-}" ] && continue
  # Push de delete de branch (nada vai pushar).
  [ "$local_sha" = "$ZERO" ] && continue

  # Branch nova (remote_sha=000...): usa merge-base com o branch default
  # do remoto pra scanear SÓ os commits únicos desta branch. Sem isso,
  # ~30..local arrasta ancestrais de outras sessões e gera falsos
  # positivos (ex: o porteiro detectando a si mesmo em um commit
  # ancestral que adicionou a SECRET_REGEX).
  if [ "${remote_sha:-$ZERO}" = "$ZERO" ]; then
    default_remote=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || true)
    default_ref="origin/${default_remote:-main}"
    if git rev-parse --verify "$default_ref" >/dev/null 2>&1; then
      base=$(git merge-base "$default_ref" "$local_sha" 2>/dev/null || true)
      range="${base:-${local_sha}~30}..${local_sha}"
    else
      range="${local_sha}~30..${local_sha}"
    fi
  else
    range="${remote_sha}..${local_sha}"
  fi

  # 1) DELETE EM MASSA — arquivos
  deleted_files_list=$(git diff --diff-filter=D --name-only "$range" 2>/dev/null || true)
  deleted_files=$(contar_linhas "$deleted_files_list")
  if [ "${deleted_files:-0}" -gt "$DELETE_FILES_MAX" ]; then
    bloqueios+=("delete em massa: ${deleted_files} arquivos deletados (limite ${DELETE_FILES_MAX})")
  fi

  # 1b) DELETE EM MASSA — linhas
  shortstat=$(git diff --shortstat "$range" 2>/dev/null || echo "")
  deletes=$(printf '%s' "$shortstat" | grep -oE '[0-9]+ deletion' | head -1 | awk '{print $1}' || true)
  deletes=${deletes:-0}
  if [ "$deletes" -gt "$DELETE_LINES_MAX" ]; then
    bloqueios+=("delete em massa: ${deletes} linhas removidas (limite ${DELETE_LINES_MAX})")
  fi

  # 2) SEGREDOS no patch (-U0 só linhas adicionadas/removidas, sem contexto).
  # Exclui o PRÓPRIO porteiro do scan: o SECRET_REGEX acima contém literais
  # (aws_secret_access_key, sk-ant-, AKIA…) que disparariam contra si quando o
  # arquivo entra no range pushado (auto-detect). Skynet tsk_0QKHJDIgYG (28/mai).
  patch_added=$(git diff -U0 "$range" -- ':(exclude).githooks/lib/frota-git-porteiro.sh' 2>/dev/null | grep -E '^\+[^+]' || true)
  segredos=$(printf '%s' "$patch_added" | grep -Eo "$SECRET_REGEX" || true)
  if [ -n "$segredos" ]; then
    amostras=$(printf '%s' "$segredos" \
      | head -3 \
      | sed -E 's/(sk-[a-z]+-)[A-Za-z0-9_-]+/\1***REDACTED***/g; s/(AKIA[0-9A-Z]{4})[0-9A-Z]{12}/\1***/g; s/(sk_live_)[A-Za-z0-9_]+/\1***REDACTED***/g; s/(ghp_|gho_)[A-Za-z0-9]+/\1***REDACTED***/g' \
      | tr '\n' ' ')
    bloqueios+=("possível segredo no patch: ${amostras}")
  fi

  # 3) LIXO no diff
  arquivos_lista=$(git diff --name-only "$range" 2>/dev/null || true)
  lixo_arquivos=()
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if eh_lixo "$f"; then
      lixo_arquivos+=("$f")
    fi
  done <<EOF
$arquivos_lista
EOF
  if [ "${#lixo_arquivos[@]}" -gt 0 ]; then
    primeiros=$(printf '%s, ' "${lixo_arquivos[@]:0:3}" | sed 's/, $//')
    extra=""
    [ "${#lixo_arquivos[@]}" -gt 3 ] && extra=" (+${#lixo_arquivos[@]} no total)"
    bloqueios+=("arquivos não-commitáveis no diff: ${primeiros}${extra}")
  fi
done

if [ "${#bloqueios[@]}" -gt 0 ]; then
  echo "" >&2
  echo "❌ [porteiro] BLOQUEADO — Sincronia da Frota detectou problemas no push:" >&2
  for b in "${bloqueios[@]}"; do
    echo "  · ${b}" >&2
  done
  echo "" >&2
  echo "Se for INTENCIONAL: git push --no-verify (com cuidado)." >&2
  echo "Overrides: SKYNET_PORTEIRO_DELETE_FILES_MAX, _DELETE_LINES_MAX, _DISABLED=1." >&2
  exit 1
fi

exit 0
