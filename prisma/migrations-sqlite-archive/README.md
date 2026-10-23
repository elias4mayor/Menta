# SQLite migration history (archived)

This is the complete, untouched SQLite migration history — every migration
folder that previously lived in `prisma/migrations/`, copied here verbatim
before the active `prisma/migrations/` folder was replaced with a fresh
PostgreSQL baseline.

**Why this exists:** SQLite and PostgreSQL migration SQL are not
interchangeable — these files use SQLite-specific syntax (`DATETIME`
columns, `PRAGMA foreign_keys`/`defer_foreign_keys` table-rebuild
sequences for ALTER TABLE) that does not apply to PostgreSQL. Reusing them
against a Postgres database would fail. The standard, correct path for a
provider switch is a fresh migration history generated from the current
schema against the new provider — not hand-translating the old SQL — so
the active `prisma/migrations/` folder now contains one new baseline
migration instead of these 29.

**This folder is not applied by Prisma and is not part of any live
migration path.** It exists purely as a readable historical record of how
the schema evolved under SQLite, in case that history is ever needed for
reference. Do not run these migrations against any database.
