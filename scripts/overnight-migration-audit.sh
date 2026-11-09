#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
prisma="$repo_root/node_modules/.bin/prisma"
baseline_migration=20260904020117_init_postgres
candidate_migration=20261109090000_ai_coach_name

command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }
[[ -x "$prisma" ]] || { echo "Run npm ci before this audit." >&2; exit 1; }
for migration in "$baseline_migration" "$candidate_migration"; do
  [[ -f "$repo_root/prisma/migrations/$migration/migration.sql" ]] || {
    echo "Missing expected migration $migration." >&2
    exit 1
  }
done

scratch="$(mktemp -d)"
container=""
cleanup() {
  if [[ -n "$container" ]]; then
    docker rm -f -v "$container" >/dev/null 2>&1 || true
  fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
cd -- "$scratch"

# All credentials and the port belong to this fresh container. Existing
# application database URLs and repository .env files are never used.
audit_password="$(node -p 'require("node:crypto").randomBytes(24).toString("hex")')"
container="$(docker run -d --publish 127.0.0.1::5432 \
  --env POSTGRES_USER=menta_audit --env "POSTGRES_PASSWORD=$audit_password" \
  --env POSTGRES_DB=menta_candidate postgres:16)"
address="$(docker port "$container" 5432/tcp)"
[[ "$address" =~ ^127\.0\.0\.1:[0-9]+$ ]] || { echo "Unexpected database bind address." >&2; exit 1; }

for (( attempt=0; attempt<60; attempt++ )); do
  if docker exec "$container" pg_isready --host=127.0.0.1 --username=menta_audit --dbname=menta_candidate >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$container" pg_isready --host=127.0.0.1 --username=menta_audit --dbname=menta_candidate >/dev/null

prepare_schema() {
  local name="$1"
  mkdir -p "$scratch/$name/migrations"
  cp -- "$repo_root/prisma/schema.prisma" "$scratch/$name/schema.prisma"
  cp -- "$repo_root/prisma/migrations/migration_lock.toml" "$scratch/$name/migrations/"
  cp -R -- "$repo_root/prisma/migrations/$baseline_migration" "$scratch/$name/migrations/"
}

deploy_migrations() {
  local database="$1" schema_dir="$2"
  local url="postgresql://menta_audit:$audit_password@$address/$database?sslmode=disable"
  DATABASE_URL="$url" DATABASE_URL_POOLED="$url" "$prisma" migrate deploy --schema "$scratch/$schema_dir/schema.prisma"
}

sql() {
  local database="$1"
  shift
  docker exec -i "$container" psql --no-psqlrc --set=ON_ERROR_STOP=1 \
    --username=menta_audit --dbname="$database" "$@"
}

fixture_state() {
  sql "$1" --no-align --tuples-only <<'SQL'
SELECT jsonb_build_array(
  (SELECT jsonb_agg(to_jsonb(u) - 'aiCoachName' ORDER BY u.id) FROM "User" u),
  (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM "AthleteProfile" p),
  (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM "PerformanceEntry" e),
  (SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM "AcademicTerm" t)
);
SQL
}

prepare_schema baseline
prepare_schema candidate
cp -R -- "$repo_root/prisma/migrations/$candidate_migration" "$scratch/candidate/migrations/"
deploy_migrations menta_candidate baseline

sql menta_candidate <<'SQL'
INSERT INTO "User" ("id", "email", "name", "updatedAt")
VALUES ('audit-user', 'audit-athlete@example.invalid', 'Synthetic Athlete', CURRENT_TIMESTAMP);
INSERT INTO "AthleteProfile" ("id", "userId", "sport", "position", "gpa", "updatedAt")
VALUES ('audit-profile', 'audit-user', 'Football', 'Running Back', 3.4, CURRENT_TIMESTAMP);
INSERT INTO "PerformanceEntry" ("id", "userId", "statName", "value", "unit")
VALUES ('audit-performance', 'audit-user', 'Sprint', 5.4, 's');
INSERT INTO "AcademicTerm" ("id", "userId", "term", "year", "gpa", "updatedAt")
VALUES ('audit-term', 'audit-user', 'Fall', 2026, 3.4, CURRENT_TIMESTAMP);
SQL

before="$(fixture_state menta_candidate)"
docker exec "$container" pg_dump --username=menta_audit --format=custom --no-owner \
  --dbname=menta_candidate > "$scratch/baseline.dump"
test -s "$scratch/baseline.dump"

deploy_migrations menta_candidate candidate
[[ "$(fixture_state menta_candidate)" == "$before" ]] || { echo "Candidate changed baseline records." >&2; exit 1; }
[[ "$(sql menta_candidate --no-align --tuples-only --command='SELECT "aiCoachName" IS NULL FROM "User" WHERE id = '\''audit-user'\''')" == "t" ]]
sql menta_candidate --command="UPDATE \"User\" SET \"aiCoachName\" = 'Ace' WHERE id = 'audit-user';"
[[ "$(sql menta_candidate --no-align --tuples-only --command='SELECT "aiCoachName" FROM "User" WHERE id = '\''audit-user'\''')" == "Ace" ]]
echo "PASS migration deploy and synthetic user, athlete profile, performance, and academic row preservation."

restore_snapshot() {
  docker exec -i "$container" pg_restore --username=menta_audit --exit-on-error \
    --no-owner --single-transaction --dbname=menta_rollback < "$scratch/baseline.dump"
}

migration_failed_abort_and_restore() {
  sql postgres --command='DROP DATABASE menta_rollback WITH (FORCE);'
  sql postgres --command='CREATE DATABASE menta_rollback;'
  restore_snapshot
}

sql postgres --command='CREATE DATABASE menta_rollback;'
restore_snapshot
[[ "$(fixture_state menta_rollback)" == "$before" ]]

# Deliberately commit damage before raising an error to exercise the restore
# path even if a broken migration committed a partial change. This fixture
# migration only exists in the private temporary directory.
prepare_schema faulty
mkdir -p "$scratch/faulty/migrations/20261109090000_audit_forced_failure"
cat > "$scratch/faulty/migrations/20261109090000_audit_forced_failure/migration.sql" <<'SQL'
BEGIN;
DELETE FROM "PerformanceEntry" WHERE id = 'audit-performance';
COMMIT;
SELECT 1 / 0;
SQL
if deploy_migrations menta_rollback faulty > "$scratch/failure.log" 2>&1; then
  echo "Expected the fault-injection migration to fail." >&2
  exit 1
fi
grep -q 'division by zero' "$scratch/failure.log"
[[ "$(fixture_state menta_rollback)" != "$before" ]] || { echo "Fault injection did not exercise committed damage." >&2; exit 1; }

migration_failed_abort_and_restore
[[ "$(fixture_state menta_rollback)" == "$before" ]] || { echo "Snapshot restore changed baseline records." >&2; exit 1; }
[[ "$(sql menta_rollback --no-align --tuples-only --command="SELECT count(*) FROM \"_prisma_migrations\" WHERE migration_name LIKE '%audit_forced_failure';")" == "0" ]]
deploy_migrations menta_rollback candidate
[[ "$(fixture_state menta_rollback)" == "$before" ]] || { echo "Redeploy after restore changed baseline records." >&2; exit 1; }
echo "PASS forced failure, snapshot restore, migration history restoration, and candidate redeploy."
