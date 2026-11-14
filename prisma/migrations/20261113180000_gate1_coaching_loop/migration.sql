-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'SUBMITTED', 'NEEDS_REVISION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('NEEDS_REVISION', 'CLOSED');

-- CreateEnum
CREATE TYPE "Comparability" AS ENUM ('PENDING', 'COMPARABLE', 'NOT_COMPARABLE');

-- CreateEnum
CREATE TYPE "AcquisitionMethod" AS ENUM ('COACH_ENTERED', 'SELF_REPORTED', 'SENSOR_MEASURED', 'MODEL_ESTIMATED');

-- CreateEnum
CREATE TYPE "Gate1Resource" AS ENUM ('ATHLETE', 'EVIDENCE', 'OBSERVATION', 'ASSIGNMENT', 'SUBMISSION');

-- CreateEnum
CREATE TYPE "Gate1Action" AS ENUM ('READ', 'PLAY_MEDIA', 'UPLOAD_EVIDENCE', 'CREATE_OBSERVATION', 'EDIT_OBSERVATION');

-- CreateTable
CREATE TABLE "ProtocolVersion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "cameraSetupNotes" TEXT NOT NULL,
    "units" TEXT,
    "successRubric" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtocolVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gate1Evidence" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "protocolVersionId" TEXT NOT NULL,
    "method" "AcquisitionMethod" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "recordingRightsConfirmedAt" TIMESTAMP(3) NOT NULL,
    "metadataVerifiedAt" TIMESTAMP(3) NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "captureNotes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gate1Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gate1Observation" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "observationNote" TEXT NOT NULL,
    "interpretationNote" TEXT,
    "method" "AcquisitionMethod" NOT NULL DEFAULT 'COACH_ENTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gate1Observation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionAssignment" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "protocolVersionId" TEXT NOT NULL,
    "baselineEvidenceId" TEXT NOT NULL,
    "customCue" TEXT NOT NULL,
    "successCriterion" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "currentAttemptNumber" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "athleteNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "feedbackNote" TEXT NOT NULL,
    "comparability" "Comparability" NOT NULL DEFAULT 'PENDING',
    "comparabilityNotes" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentStateHistory" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousState" "AssignmentStatus",
    "newState" "AssignmentStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "submissionId" TEXT,
    "reviewId" TEXT,
    "operationKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "transitionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentGrant" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "resourceType" "Gate1Resource" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "permittedActions" "Gate1Action"[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtocolVersion_exerciseId_versionNumber_key" ON "ProtocolVersion"("exerciseId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Gate1Evidence_filmId_key" ON "Gate1Evidence"("filmId");

-- CreateIndex
CREATE INDEX "Gate1Evidence_athleteId_createdAt_idx" ON "Gate1Evidence"("athleteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Gate1Observation_clipId_key" ON "Gate1Observation"("clipId");

-- CreateIndex
CREATE INDEX "ActionAssignment_athleteId_status_dueAt_idx" ON "ActionAssignment"("athleteId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ActionAssignment_teamId_status_dueAt_idx" ON "ActionAssignment"("teamId", "status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_attemptNumber_key" ON "AssignmentSubmission"("assignmentId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentReview_submissionId_key" ON "AssignmentReview"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentStateHistory_assignmentId_version_key" ON "AssignmentStateHistory"("assignmentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentStateHistory_actorId_operationKey_key" ON "AssignmentStateHistory"("actorId", "operationKey");

-- CreateIndex
CREATE INDEX "ConsentGrant_athleteId_granteeId_teamId_resourceType_resour_idx" ON "ConsentGrant"("athleteId", "granteeId", "teamId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "ProtocolVersion" ADD CONSTRAINT "ProtocolVersion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Evidence" ADD CONSTRAINT "Gate1Evidence_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Evidence" ADD CONSTRAINT "Gate1Evidence_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Evidence" ADD CONSTRAINT "Gate1Evidence_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Evidence" ADD CONSTRAINT "Gate1Evidence_protocolVersionId_fkey" FOREIGN KEY ("protocolVersionId") REFERENCES "ProtocolVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Observation" ADD CONSTRAINT "Gate1Observation_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Gate1Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Observation" ADD CONSTRAINT "Gate1Observation_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate1Observation" ADD CONSTRAINT "Gate1Observation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Gate1Observation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_protocolVersionId_fkey" FOREIGN KEY ("protocolVersionId") REFERENCES "ProtocolVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAssignment" ADD CONSTRAINT "ActionAssignment_baselineEvidenceId_fkey" FOREIGN KEY ("baselineEvidenceId") REFERENCES "Gate1Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ActionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Gate1Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReview" ADD CONSTRAINT "AssignmentReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentReview" ADD CONSTRAINT "AssignmentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStateHistory" ADD CONSTRAINT "AssignmentStateHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ActionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStateHistory" ADD CONSTRAINT "AssignmentStateHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStateHistory" ADD CONSTRAINT "AssignmentStateHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentStateHistory" ADD CONSTRAINT "AssignmentStateHistory_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AssignmentReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentGrant" ADD CONSTRAINT "ConsentGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Runtime roles must not own tables or have DDL/TRUNCATE privileges. Migration
-- owners can remove triggers; these are integrity guards, not owner-proof logs.
CREATE FUNCTION gate1_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Gate 1 record is immutable' USING ERRCODE='23001'; END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ProtocolVersion','Gate1Evidence','AssignmentSubmission','AssignmentReview','AssignmentStateHistory'] LOOP
    EXECUTE format('CREATE TRIGGER gate1_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION gate1_immutable()', t);
    EXECUTE format('CREATE TRIGGER gate1_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION gate1_immutable()', t);
  END LOOP;
END $$;
ALTER TABLE "ProtocolVersion" ADD CONSTRAINT protocol_positive_version CHECK ("versionNumber" > 0);
ALTER TABLE "ActionAssignment" ADD CONSTRAINT action_positive_counters CHECK (version > 0 AND "currentAttemptNumber" >= 0);
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT attempt_positive CHECK ("attemptNumber" > 0);
ALTER TABLE "AssignmentReview" ADD CONSTRAINT closed_requires_comparable CHECK (decision <> 'CLOSED' OR comparability = 'COMPARABLE');
ALTER TABLE "AssignmentReview" ADD CONSTRAINT review_notes_required CHECK (length(btrim("feedbackNote")) > 0 AND length(btrim("comparabilityNotes")) > 0);
ALTER TABLE "ConsentGrant" ADD CONSTRAINT grant_validity CHECK ("expiresAt" > "grantedAt" AND cardinality("permittedActions") > 0 AND "grantedById" = "athleteId");

CREATE FUNCTION gate1_evidence_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f "Film"; p "ProtocolVersion"; t "Team"; ex "Exercise";
BEGIN
  SELECT * INTO STRICT f FROM "Film" WHERE id=NEW."filmId" FOR UPDATE;
  SELECT * INTO STRICT p FROM "ProtocolVersion" WHERE id=NEW."protocolVersionId";
  SELECT * INTO STRICT ex FROM "Exercise" WHERE id=p."exerciseId";
  SELECT * INTO STRICT t FROM "Team" WHERE id=NEW."teamId";
  IF f."durationSec" IS NULL OR NOT (f."durationSec">0 AND f."durationSec"<'Infinity'::float8)
     OR f."teamId" IS DISTINCT FROM NEW."teamId" OR f.visibility <> 'PRIVATE'
     OR ex."teamId" IS DISTINCT FROM NEW."teamId" OR p.sport IS DISTINCT FROM t.sport THEN
    RAISE EXCEPTION 'Invalid Gate 1 evidence context' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gate1_evidence_integrity BEFORE INSERT ON "Gate1Evidence" FOR EACH ROW EXECUTE FUNCTION gate1_evidence_integrity();

-- Once registered, original film metadata/object identity cannot be rewritten.
CREATE FUNCTION gate1_film_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Gate1Evidence" WHERE "filmId"=OLD.id) THEN
    RAISE EXCEPTION 'Gate 1 evidence film is immutable' USING ERRCODE='23001';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER gate1_film_guard BEFORE UPDATE OR DELETE ON "Film" FOR EACH ROW EXECUTE FUNCTION gate1_film_guard();

CREATE FUNCTION gate1_observation_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Gate1Evidence"; c "Clip"; f "Film";
BEGIN
  IF TG_OP='UPDATE' THEN
    IF EXISTS (SELECT 1 FROM "ActionAssignment" WHERE "observationId"=OLD.id)
       OR NEW."evidenceId"<>OLD."evidenceId" OR NEW."clipId"<>OLD."clipId" OR NEW."authorId"<>OLD."authorId" THEN
      RAISE EXCEPTION 'Pinned observation is immutable' USING ERRCODE='23001';
    END IF;
  END IF;
  SELECT * INTO STRICT e FROM "Gate1Evidence" WHERE id=NEW."evidenceId";
  SELECT * INTO STRICT c FROM "Clip" WHERE id=NEW."clipId" FOR UPDATE;
  SELECT * INTO STRICT f FROM "Film" WHERE id=e."filmId";
  IF c."filmId"<>f.id OR c."createdById"<>NEW."authorId" OR c."endSec" IS NULL OR
     NOT (c."startSec">=0 AND c."endSec">c."startSec" AND c."endSec"<=f."durationSec") THEN
    RAISE EXCEPTION 'Invalid observation clip range' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gate1_observation_integrity BEFORE INSERT OR UPDATE ON "Gate1Observation" FOR EACH ROW EXECUTE FUNCTION gate1_observation_integrity();
CREATE FUNCTION gate1_clip_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Gate1Observation" WHERE "clipId"=OLD.id) THEN
    RAISE EXCEPTION 'Gate 1 clip is immutable' USING ERRCODE='23001';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER gate1_clip_guard BEFORE UPDATE OR DELETE ON "Clip" FOR EACH ROW EXECUTE FUNCTION gate1_clip_guard();

CREATE FUNCTION gate1_assignment_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Gate1Evidence"; o "Gate1Observation";
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'ASSIGNED' OR NEW.version<>1 OR NEW."currentAttemptNumber"<>0 THEN
      RAISE EXCEPTION 'Invalid initial state' USING ERRCODE='23514';
    END IF;
  ELSE
    IF (to_jsonb(NEW)-ARRAY['status','version','currentAttemptNumber','updatedAt']) IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY['status','version','currentAttemptNumber','updatedAt']) THEN
      RAISE EXCEPTION 'Assignment protocol and baseline are pinned' USING ERRCODE='23001';
    END IF;
    IF NEW.version<>OLD.version+1 OR NOT (
      (OLD.status='ASSIGNED' AND NEW.status='ACCEPTED') OR
      (OLD.status IN ('ACCEPTED','NEEDS_REVISION') AND NEW.status='SUBMITTED') OR
      (OLD.status='SUBMITTED' AND NEW.status IN ('CLOSED','NEEDS_REVISION'))
    ) OR NEW."currentAttemptNumber" <> OLD."currentAttemptNumber" + (CASE WHEN NEW.status='SUBMITTED' THEN 1 ELSE 0 END) THEN
      RAISE EXCEPTION 'Invalid state transition' USING ERRCODE='23514';
    END IF;
  END IF;
  SELECT * INTO STRICT e FROM "Gate1Evidence" WHERE id=NEW."baselineEvidenceId";
  SELECT * INTO STRICT o FROM "Gate1Observation" WHERE id=NEW."observationId" FOR SHARE;
  IF e."athleteId"<>NEW."athleteId" OR e."teamId"<>NEW."teamId" OR e."protocolVersionId"<>NEW."protocolVersionId" OR o."evidenceId"<>e.id THEN
    RAISE EXCEPTION 'Assignment evidence mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gate1_assignment_integrity BEFORE INSERT OR UPDATE ON "ActionAssignment" FOR EACH ROW EXECUTE FUNCTION gate1_assignment_integrity();

CREATE FUNCTION gate1_submission_integrity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a "ActionAssignment"; e "Gate1Evidence"; b "Gate1Evidence";
BEGIN
  SELECT * INTO STRICT a FROM "ActionAssignment" WHERE id=NEW."assignmentId";
  SELECT * INTO STRICT e FROM "Gate1Evidence" WHERE id=NEW."evidenceId";
  SELECT * INTO STRICT b FROM "Gate1Evidence" WHERE id=a."baselineEvidenceId";
  IF a.status NOT IN ('ACCEPTED','NEEDS_REVISION') OR NEW."attemptNumber"<>a."currentAttemptNumber"+1 OR
     e."athleteId"<>a."athleteId" OR e."teamId"<>a."teamId" OR e."protocolVersionId"<>a."protocolVersionId" OR
     e."contentSha256"=b."contentSha256" OR e."recordedAt"<=b."recordedAt" THEN
    RAISE EXCEPTION 'Submission evidence mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER gate1_submission_integrity BEFORE INSERT ON "AssignmentSubmission" FOR EACH ROW EXECUTE FUNCTION gate1_submission_integrity();

-- The state and matching event must commit together. A direct status UPDATE,
-- orphan submission, or review without its transition cannot commit.
CREATE FUNCTION gate1_check_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a "ActionAssignment"; h "AssignmentStateHistory"; prev "AssignmentStateHistory";
        s "AssignmentSubmission"; r "AssignmentReview"; target_id text;
BEGIN
  IF TG_TABLE_NAME='ActionAssignment' THEN target_id:=NEW.id;
  ELSIF TG_TABLE_NAME='AssignmentReview' THEN SELECT "assignmentId" INTO target_id FROM "AssignmentSubmission" WHERE id=NEW."submissionId";
  ELSE target_id:=NEW."assignmentId"; END IF;
  SELECT * INTO STRICT a FROM "ActionAssignment" WHERE id=target_id;
  SELECT * INTO h FROM "AssignmentStateHistory" WHERE "assignmentId"=a.id AND version=a.version;
  IF h.id IS NULL OR h."newState"<>a.status THEN
    RAISE EXCEPTION 'Matching history required' USING ERRCODE='23514';
  END IF;
  IF TG_TABLE_NAME='AssignmentSubmission' THEN
    IF h."submissionId" IS DISTINCT FROM NEW.id OR a.status<>'SUBMITTED' THEN
      RAISE EXCEPTION 'Orphan submission' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='AssignmentReview' THEN
    IF h."reviewId" IS DISTINCT FROM NEW.id OR a.status NOT IN ('CLOSED','NEEDS_REVISION') THEN
      RAISE EXCEPTION 'Orphan review' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME='AssignmentStateHistory' THEN
    IF NEW.version<>a.version THEN
      RAISE EXCEPTION 'Unexpected history version' USING ERRCODE='23514';
    END IF;
  END IF;
  IF a.version=1 THEN
    IF h."previousState" IS NOT NULL OR h."actorId"<>a."assignedById" OR h."submissionId" IS NOT NULL OR h."reviewId" IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid initial history' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT * INTO prev FROM "AssignmentStateHistory" WHERE "assignmentId"=a.id AND version=a.version-1;
    IF prev.id IS NULL OR h."previousState" IS DISTINCT FROM prev."newState" THEN
      RAISE EXCEPTION 'Broken history chain' USING ERRCODE='23514';
    END IF;
  END IF;
  IF a.status='ACCEPTED' AND (h."actorId"<>a."athleteId" OR h."submissionId" IS NOT NULL OR h."reviewId" IS NOT NULL) THEN
    RAISE EXCEPTION 'Invalid acceptance history' USING ERRCODE='23514';
  END IF;
  IF a.status IN ('SUBMITTED','CLOSED','NEEDS_REVISION') THEN
    SELECT * INTO s FROM "AssignmentSubmission" WHERE id=h."submissionId";
    IF s.id IS NULL OR s."assignmentId"<>a.id OR s."attemptNumber"<>a."currentAttemptNumber" THEN
      RAISE EXCEPTION 'Invalid history submission' USING ERRCODE='23514';
    END IF;
    IF a.status='SUBMITTED' AND (h."actorId"<>a."athleteId" OR h."reviewId" IS NOT NULL) THEN
      RAISE EXCEPTION 'Invalid submission actor' USING ERRCODE='23514';
    END IF;
    IF a.status IN ('CLOSED','NEEDS_REVISION') THEN
      SELECT * INTO r FROM "AssignmentReview" WHERE id=h."reviewId";
      IF r.id IS NULL OR r."submissionId"<>s.id OR r."decision"::text<>a.status::text OR r."reviewerId"<>h."actorId" THEN
        RAISE EXCEPTION 'Invalid history review' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ActionAssignment','AssignmentSubmission','AssignmentReview','AssignmentStateHistory'] LOOP
    EXECUTE format('CREATE CONSTRAINT TRIGGER gate1_history_required AFTER INSERT OR UPDATE ON %I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gate1_check_history()', t);
  END LOOP;
END $$;
