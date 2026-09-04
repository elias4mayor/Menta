-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ATHLETE',
    "dateOfBirth" TIMESTAMP(3),
    "emailVerified" TIMESTAMP(3),
    "googleId" TEXT,
    "facebookId" TEXT,
    "avatarKey" TEXT,
    "avatarMime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "stateCode" TEXT,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT,
    "position" TEXT,
    "graduationYear" INTEGER,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "schoolName" TEXT,
    "schoolType" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "bio" TEXT,
    "gpa" DOUBLE PRECISION,
    "trainingDaysPerWeek" INTEGER,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteSportContext" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "position" TEXT,
    "teamId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteSportContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "sport" TEXT,
    "coachingRole" TEXT,
    "yearsCoaching" INTEGER,
    "organizationName" TEXT,
    "schoolName" TEXT,
    "schoolType" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "focusAreas" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "businessName" TEXT,
    "sport" TEXT,
    "specialties" TEXT,
    "trainingLocation" TEXT,
    "yearsExperience" INTEGER,
    "certifications" TEXT,
    "trainingPhilosophy" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "goals" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "specialties" TEXT,
    "credentials" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "relationship" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "goals" TEXT,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT,
    "organizationId" TEXT,
    "inviteCode" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamRole" TEXT NOT NULL DEFAULT 'ATHLETE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAvailability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareRequest" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedStart" TIMESTAMP(3) NOT NULL,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "providerNote" TEXT,
    "followUpOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "actionPlan" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sportContextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "exercises" TEXT,
    "planTag" TEXT,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "sportContextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutCompletion" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effort" INTEGER,
    "notes" TEXT,

    CONSTRAINT "WorkoutCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "sportContextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "externalId" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "topic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetMessageId" TEXT,
    "category" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianLink" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Film" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GAME',
    "opponent" TEXT,
    "opponentId" TEXT,
    "season" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "teamId" TEXT,
    "positionGroupId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "sportContextId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmSharedWithUser" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmSharedWithUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startSec" DOUBLE PRECISION NOT NULL,
    "endSec" DOUBLE PRECISION,
    "label" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HighlightItem" (
    "id" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "HighlightItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionGroup" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionGroupMembership" (
    "id" TEXT NOT NULL,
    "positionGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupRole" TEXT NOT NULL DEFAULT 'ATHLETE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamPermissionGrant" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "permission" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmTagDefinition" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sport" TEXT,
    "label" TEXT NOT NULL,
    "category" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmTagDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmTagInstance" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "tagDefinitionId" TEXT NOT NULL,
    "timestampSec" DOUBLE PRECISION,
    "athleteId" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmTagInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmComment" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "authorId" TEXT NOT NULL,
    "timestampSec" DOUBLE PRECISION,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'SHARED',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FilmComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAnnotation" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "createdById" TEXT NOT NULL,
    "timestampSec" DOUBLE PRECISION NOT NULL,
    "data" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'SHARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmPlaylist" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "teamId" TEXT,
    "positionGroupId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmPlaylistItem" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,
    "order" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmPlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAssignment" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "assignedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "filmId" TEXT,
    "playlistId" TEXT,
    "clipId" TEXT,
    "dueAt" TIMESTAMP(3),
    "requiredViewing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAssignmentTarget" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "comment" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAssignmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmReviewRequest" (
    "id" TEXT NOT NULL,
    "filmId" TEXT NOT NULL,
    "clipId" TEXT,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT,
    "timestampSec" DOUBLE PRECISION,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "response" TEXT,
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachNote" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "teamId" TEXT,
    "filmId" TEXT,
    "clipId" TEXT,
    "body" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAnalysisTemplate" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sport" TEXT,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAnalysisTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAnalysisCategory" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "FilmAnalysisCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmAnalysisEntry" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,
    "athleteId" TEXT,
    "score" DOUBLE PRECISION,
    "notes" TEXT,
    "gradedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmAnalysisEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmReport" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmReportSource" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "filmId" TEXT,
    "clipId" TEXT,

    CONSTRAINT "FilmReportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opponent" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sport" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutReport" (
    "id" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tendencies" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoutReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutReportTag" (
    "id" TEXT NOT NULL,
    "scoutReportId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ScoutReportTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmShareGrant" (
    "id" TEXT NOT NULL,
    "filmId" TEXT,
    "playlistId" TEXT,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "FilmShareGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingSchool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "division" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TARGET',
    "priority" INTEGER,
    "notes" TEXT,
    "sportContextId" TEXT,
    "collegeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitingSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONTACTED',
    "notes" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "coachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruitingContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "contactId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NOTE',
    "subject" TEXT,
    "body" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "College" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT,
    "sport" TEXT NOT NULL,
    "division" TEXT,
    "conference" TEXT,
    "schoolName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "isHeadCoach" BOOLEAN,
    "season" TEXT,
    "headshotUrl" TEXT,
    "bioUrl" TEXT,
    "profileSlug" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterEntry" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "classYear" TEXT,
    "jerseyNumber" TEXT,
    "hometown" TEXT,
    "headshotUrl" TEXT,
    "isVerified" BOOLEAN,
    "personId" TEXT,
    "season" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterChange" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "changeType" TEXT NOT NULL,
    "subjectName" TEXT,
    "subjectPosition" TEXT,
    "subjectClassYear" TEXT,
    "personId" TEXT,
    "sportPath" TEXT,
    "division" TEXT,
    "season" TEXT,
    "schoolName" TEXT,
    "schoolLogoUrl" TEXT,
    "fromTeamProviderId" TEXT,
    "toTeamProviderId" TEXT,
    "fromDivision" TEXT,
    "toDivision" TEXT,
    "fromConference" TEXT,
    "toConference" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitingSignal" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "collegeId" TEXT,
    "signalType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "subjectName" TEXT,
    "isHeadCoach" BOOLEAN,
    "fromTitle" TEXT,
    "toTitle" TEXT,
    "provider" TEXT NOT NULL,
    "providerRecordId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecruitingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WellnessCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "energy" INTEGER,
    "soreness" INTEGER,
    "stress" INTEGER,
    "mood" INTEGER,
    "readiness" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MindCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pressure" INTEGER,
    "confidence" INTEGER,
    "focus" INTEGER,
    "readiness" INTEGER,
    "todayGoal" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MindCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "year" INTEGER,
    "gpa" DOUBLE PRECISION,
    "gpaScale" DOUBLE PRECISION,
    "classInfo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "grade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleClassroomIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "googleUserId" TEXT NOT NULL,
    "googleEmail" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "GoogleClassroomIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleClassroomCourse" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "googleCourseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT,
    "description" TEXT,
    "room" TEXT,
    "courseState" TEXT,
    "alternateLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleClassroomCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleClassroomAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "googleCourseworkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT,
    "workType" TEXT,
    "dueDate" TIMESTAMP(3),
    "maxPoints" DOUBLE PRECISION,
    "alternateLink" TEXT,
    "creationTime" TIMESTAMP(3),
    "updateTime" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleClassroomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleClassroomSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "googleSubmissionId" TEXT NOT NULL,
    "state" TEXT,
    "assignedGrade" DOUBLE PRECISION,
    "draftGrade" DOUBLE PRECISION,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "updateTime" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleClassroomSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EligibilityChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EligibilityChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalSafetyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "allergies" TEXT,
    "medicalNotes" TEXT,
    "medicationNotes" TEXT,
    "emergencyPlanNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalSafetyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSafetyProtocol" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSafetyProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSafetyChecklistItem" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamSafetyChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "ownerId" TEXT,
    "teamId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfilledDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "sport" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "positions" TEXT,
    "movementPattern" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "coachingCues" TEXT,
    "videoUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgram" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "positionGroupId" TEXT,
    "sport" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trainingMode" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingBlock" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "blockType" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramExercise" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "targetSets" INTEGER,
    "targetReps" TEXT,
    "targetLoad" DOUBLE PRECISION,
    "targetLoadPercent" DOUBLE PRECISION,
    "targetLoadUnit" TEXT,
    "tempo" TEXT,
    "restSec" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "rpeTarget" DOUBLE PRECISION,
    "supersetGroup" TEXT,
    "notes" TEXT,
    "modeDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthletePrescription" (
    "id" TEXT NOT NULL,
    "programExerciseId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "prescribedLoad" DOUBLE PRECISION,
    "prescribedLoadUnit" TEXT,
    "prescribedReps" TEXT,
    "prescribedSets" INTEGER,
    "calculationBasis" TEXT,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthletePrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "programId" TEXT,
    "positionGroupId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "currentBlockId" TEXT,
    "currentProgramExerciseId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroup" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationLabel" TEXT,
    "order" INTEGER,
    "currentBlockId" TEXT,
    "currentProgramExerciseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSet" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "programExerciseId" TEXT,
    "groupId" TEXT,
    "athleteId" TEXT NOT NULL,
    "loggedById" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "weightUnit" TEXT,
    "rpe" DOUBLE PRECISION,
    "durationSec" DOUBLE PRECISION,
    "distanceMeters" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "scope" TEXT NOT NULL,
    "priceCents" INTEGER,
    "billingInterval" TEXT NOT NULL DEFAULT 'MONTH',
    "stripePriceId" TEXT,
    "isCustomPricing" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEntitlement" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "limitValue" INTEGER,

    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_facebookId_key" ON "User"("facebookId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "City_countryCode_stateCode_name_idx" ON "City"("countryCode", "stateCode", "name");

-- CreateIndex
CREATE INDEX "City_countryCode_name_idx" ON "City"("countryCode", "name");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");

-- CreateIndex
CREATE INDEX "AthleteSportContext_userId_idx" ON "AthleteSportContext"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteSportContext_userId_sport_key" ON "AthleteSportContext"("userId", "sport");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProfile_userId_key" ON "TrainerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_userId_key" ON "DoctorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_inviteCode_key" ON "Team"("inviteCode");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");

-- CreateIndex
CREATE INDEX "ProviderAvailability_providerId_idx" ON "ProviderAvailability"("providerId");

-- CreateIndex
CREATE INDEX "ProviderAvailability_teamId_idx" ON "ProviderAvailability"("teamId");

-- CreateIndex
CREATE INDEX "CareRequest_athleteId_idx" ON "CareRequest"("athleteId");

-- CreateIndex
CREATE INDEX "CareRequest_providerId_idx" ON "CareRequest"("providerId");

-- CreateIndex
CREATE INDEX "CareRequest_teamId_idx" ON "CareRequest"("teamId");

-- CreateIndex
CREATE INDEX "CareRequest_status_idx" ON "CareRequest"("status");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_sportContextId_idx" ON "Goal"("sportContextId");

-- CreateIndex
CREATE INDEX "Workout_teamId_idx" ON "Workout"("teamId");

-- CreateIndex
CREATE INDEX "Workout_createdById_idx" ON "Workout"("createdById");

-- CreateIndex
CREATE INDEX "Workout_assignedToId_idx" ON "Workout"("assignedToId");

-- CreateIndex
CREATE INDEX "Workout_sportContextId_idx" ON "Workout"("sportContextId");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_workoutId_idx" ON "WorkoutCompletion"("workoutId");

-- CreateIndex
CREATE INDEX "WorkoutCompletion_userId_idx" ON "WorkoutCompletion"("userId");

-- CreateIndex
CREATE INDEX "PerformanceEntry_userId_idx" ON "PerformanceEntry"("userId");

-- CreateIndex
CREATE INDEX "PerformanceEntry_userId_statName_idx" ON "PerformanceEntry"("userId", "statName");

-- CreateIndex
CREATE INDEX "PerformanceEntry_sportContextId_idx" ON "PerformanceEntry"("sportContextId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_teamId_key" ON "Conversation"("teamId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "CalendarEvent_teamId_idx" ON "CalendarEvent"("teamId");

-- CreateIndex
CREATE INDEX "CalendarEvent_createdById_idx" ON "CalendarEvent"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_createdById_source_externalId_key" ON "CalendarEvent"("createdById", "source", "externalId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_topic_idx" ON "AIConversation"("userId", "topic");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianLink_guardianId_athleteId_key" ON "GuardianLink"("guardianId", "athleteId");

-- CreateIndex
CREATE INDEX "Film_teamId_idx" ON "Film"("teamId");

-- CreateIndex
CREATE INDEX "Film_uploadedById_idx" ON "Film"("uploadedById");

-- CreateIndex
CREATE INDEX "Film_sportContextId_idx" ON "Film"("sportContextId");

-- CreateIndex
CREATE INDEX "Film_positionGroupId_idx" ON "Film"("positionGroupId");

-- CreateIndex
CREATE INDEX "Film_opponentId_idx" ON "Film"("opponentId");

-- CreateIndex
CREATE INDEX "FilmSharedWithUser_userId_idx" ON "FilmSharedWithUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FilmSharedWithUser_filmId_userId_key" ON "FilmSharedWithUser"("filmId", "userId");

-- CreateIndex
CREATE INDEX "Clip_filmId_idx" ON "Clip"("filmId");

-- CreateIndex
CREATE INDEX "Highlight_userId_idx" ON "Highlight"("userId");

-- CreateIndex
CREATE INDEX "HighlightItem_highlightId_idx" ON "HighlightItem"("highlightId");

-- CreateIndex
CREATE UNIQUE INDEX "HighlightItem_highlightId_clipId_key" ON "HighlightItem"("highlightId", "clipId");

-- CreateIndex
CREATE INDEX "PositionGroup_teamId_idx" ON "PositionGroup"("teamId");

-- CreateIndex
CREATE INDEX "PositionGroupMembership_userId_idx" ON "PositionGroupMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PositionGroupMembership_positionGroupId_userId_key" ON "PositionGroupMembership"("positionGroupId", "userId");

-- CreateIndex
CREATE INDEX "TeamPermissionGrant_teamId_userId_idx" ON "TeamPermissionGrant"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamPermissionGrant_positionGroupId_idx" ON "TeamPermissionGrant"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmTagDefinition_teamId_idx" ON "FilmTagDefinition"("teamId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_filmId_idx" ON "FilmTagInstance"("filmId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_clipId_idx" ON "FilmTagInstance"("clipId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_tagDefinitionId_idx" ON "FilmTagInstance"("tagDefinitionId");

-- CreateIndex
CREATE INDEX "FilmTagInstance_athleteId_idx" ON "FilmTagInstance"("athleteId");

-- CreateIndex
CREATE INDEX "FilmComment_filmId_idx" ON "FilmComment"("filmId");

-- CreateIndex
CREATE INDEX "FilmComment_clipId_idx" ON "FilmComment"("clipId");

-- CreateIndex
CREATE INDEX "FilmComment_parentId_idx" ON "FilmComment"("parentId");

-- CreateIndex
CREATE INDEX "FilmAnnotation_filmId_idx" ON "FilmAnnotation"("filmId");

-- CreateIndex
CREATE INDEX "FilmAnnotation_clipId_idx" ON "FilmAnnotation"("clipId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_teamId_idx" ON "FilmPlaylist"("teamId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_positionGroupId_idx" ON "FilmPlaylist"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmPlaylist_ownerId_idx" ON "FilmPlaylist"("ownerId");

-- CreateIndex
CREATE INDEX "FilmPlaylistItem_playlistId_idx" ON "FilmPlaylistItem"("playlistId");

-- CreateIndex
CREATE INDEX "FilmAssignment_teamId_idx" ON "FilmAssignment"("teamId");

-- CreateIndex
CREATE INDEX "FilmAssignment_positionGroupId_idx" ON "FilmAssignment"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmAssignmentTarget_userId_idx" ON "FilmAssignmentTarget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FilmAssignmentTarget_assignmentId_userId_key" ON "FilmAssignmentTarget"("assignmentId", "userId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_filmId_idx" ON "FilmReviewRequest"("filmId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_athleteId_idx" ON "FilmReviewRequest"("athleteId");

-- CreateIndex
CREATE INDEX "FilmReviewRequest_coachId_idx" ON "FilmReviewRequest"("coachId");

-- CreateIndex
CREATE INDEX "CoachNote_athleteId_idx" ON "CoachNote"("athleteId");

-- CreateIndex
CREATE INDEX "CoachNote_coachId_idx" ON "CoachNote"("coachId");

-- CreateIndex
CREATE INDEX "FilmAnalysisTemplate_teamId_idx" ON "FilmAnalysisTemplate"("teamId");

-- CreateIndex
CREATE INDEX "FilmAnalysisCategory_templateId_idx" ON "FilmAnalysisCategory"("templateId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_templateId_idx" ON "FilmAnalysisEntry"("templateId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_categoryId_idx" ON "FilmAnalysisEntry"("categoryId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_athleteId_idx" ON "FilmAnalysisEntry"("athleteId");

-- CreateIndex
CREATE INDEX "FilmAnalysisEntry_filmId_idx" ON "FilmAnalysisEntry"("filmId");

-- CreateIndex
CREATE INDEX "FilmReport_teamId_idx" ON "FilmReport"("teamId");

-- CreateIndex
CREATE INDEX "FilmReport_positionGroupId_idx" ON "FilmReport"("positionGroupId");

-- CreateIndex
CREATE INDEX "FilmReportSource_reportId_idx" ON "FilmReportSource"("reportId");

-- CreateIndex
CREATE INDEX "Opponent_teamId_idx" ON "Opponent"("teamId");

-- CreateIndex
CREATE INDEX "ScoutReport_opponentId_idx" ON "ScoutReport"("opponentId");

-- CreateIndex
CREATE INDEX "ScoutReport_teamId_idx" ON "ScoutReport"("teamId");

-- CreateIndex
CREATE INDEX "ScoutReportTag_scoutReportId_idx" ON "ScoutReportTag"("scoutReportId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_fromTeamId_idx" ON "FilmShareGrant"("fromTeamId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_toTeamId_idx" ON "FilmShareGrant"("toTeamId");

-- CreateIndex
CREATE INDEX "FilmShareGrant_filmId_idx" ON "FilmShareGrant"("filmId");

-- CreateIndex
CREATE INDEX "RecruitingSchool_userId_idx" ON "RecruitingSchool"("userId");

-- CreateIndex
CREATE INDEX "RecruitingSchool_sportContextId_idx" ON "RecruitingSchool"("sportContextId");

-- CreateIndex
CREATE INDEX "RecruitingSchool_collegeId_idx" ON "RecruitingSchool"("collegeId");

-- CreateIndex
CREATE INDEX "RecruitingContact_userId_idx" ON "RecruitingContact"("userId");

-- CreateIndex
CREATE INDEX "RecruitingContact_schoolId_idx" ON "RecruitingContact"("schoolId");

-- CreateIndex
CREATE INDEX "RecruitingContact_coachId_idx" ON "RecruitingContact"("coachId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_userId_idx" ON "RecruitingActivity"("userId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_schoolId_idx" ON "RecruitingActivity"("schoolId");

-- CreateIndex
CREATE INDEX "RecruitingActivity_contactId_idx" ON "RecruitingActivity"("contactId");

-- CreateIndex
CREATE INDEX "College_name_idx" ON "College"("name");

-- CreateIndex
CREATE INDEX "Program_collegeId_idx" ON "Program"("collegeId");

-- CreateIndex
CREATE INDEX "Program_sport_division_idx" ON "Program"("sport", "division");

-- CreateIndex
CREATE UNIQUE INDEX "Program_provider_providerRecordId_key" ON "Program"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "Coach_programId_idx" ON "Coach"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "Coach_provider_providerRecordId_key" ON "Coach"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RosterEntry_programId_idx" ON "RosterEntry"("programId");

-- CreateIndex
CREATE INDEX "RosterEntry_personId_idx" ON "RosterEntry"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterEntry_provider_providerRecordId_key" ON "RosterEntry"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RosterChange_programId_idx" ON "RosterChange"("programId");

-- CreateIndex
CREATE INDEX "RosterChange_personId_idx" ON "RosterChange"("personId");

-- CreateIndex
CREATE INDEX "RosterChange_publishedAt_idx" ON "RosterChange"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RosterChange_provider_providerRecordId_key" ON "RosterChange"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_programId_idx" ON "RecruitingSignal"("programId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_collegeId_idx" ON "RecruitingSignal"("collegeId");

-- CreateIndex
CREATE INDEX "RecruitingSignal_publishedAt_idx" ON "RecruitingSignal"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitingSignal_provider_providerRecordId_key" ON "RecruitingSignal"("provider", "providerRecordId");

-- CreateIndex
CREATE INDEX "WellnessCheckIn_userId_idx" ON "WellnessCheckIn"("userId");

-- CreateIndex
CREATE INDEX "WellnessCheckIn_userId_date_idx" ON "WellnessCheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX "MindCheckIn_userId_idx" ON "MindCheckIn"("userId");

-- CreateIndex
CREATE INDEX "MindCheckIn_userId_date_idx" ON "MindCheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX "AcademicTerm_userId_idx" ON "AcademicTerm"("userId");

-- CreateIndex
CREATE INDEX "Assignment_userId_idx" ON "Assignment"("userId");

-- CreateIndex
CREATE INDEX "Assignment_userId_status_idx" ON "Assignment"("userId", "status");

-- CreateIndex
CREATE INDEX "Assignment_userId_dueDate_idx" ON "Assignment"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "AcademicGoal_userId_idx" ON "AcademicGoal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomIntegration_userId_key" ON "GoogleClassroomIntegration"("userId");

-- CreateIndex
CREATE INDEX "GoogleClassroomIntegration_userId_idx" ON "GoogleClassroomIntegration"("userId");

-- CreateIndex
CREATE INDEX "GoogleClassroomCourse_integrationId_idx" ON "GoogleClassroomCourse"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomCourse_integrationId_googleCourseId_key" ON "GoogleClassroomCourse"("integrationId", "googleCourseId");

-- CreateIndex
CREATE INDEX "GoogleClassroomAssignment_courseId_idx" ON "GoogleClassroomAssignment"("courseId");

-- CreateIndex
CREATE INDEX "GoogleClassroomAssignment_courseId_dueDate_idx" ON "GoogleClassroomAssignment"("courseId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomAssignment_courseId_googleCourseworkId_key" ON "GoogleClassroomAssignment"("courseId", "googleCourseworkId");

-- CreateIndex
CREATE INDEX "GoogleClassroomSubmission_assignmentId_idx" ON "GoogleClassroomSubmission"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleClassroomSubmission_assignmentId_googleSubmissionId_key" ON "GoogleClassroomSubmission"("assignmentId", "googleSubmissionId");

-- CreateIndex
CREATE INDEX "EligibilityChecklistItem_userId_idx" ON "EligibilityChecklistItem"("userId");

-- CreateIndex
CREATE INDEX "EmergencyContact_userId_idx" ON "EmergencyContact"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalSafetyProfile_userId_key" ON "PersonalSafetyProfile"("userId");

-- CreateIndex
CREATE INDEX "SafetyChecklistItem_userId_idx" ON "SafetyChecklistItem"("userId");

-- CreateIndex
CREATE INDEX "TeamSafetyProtocol_teamId_idx" ON "TeamSafetyProtocol"("teamId");

-- CreateIndex
CREATE INDEX "TeamSafetyChecklistItem_teamId_idx" ON "TeamSafetyChecklistItem"("teamId");

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_teamId_idx" ON "Document"("teamId");

-- CreateIndex
CREATE INDEX "DocumentRequest_athleteId_idx" ON "DocumentRequest"("athleteId");

-- CreateIndex
CREATE INDEX "Exercise_teamId_idx" ON "Exercise"("teamId");

-- CreateIndex
CREATE INDEX "Exercise_sport_idx" ON "Exercise"("sport");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");

-- CreateIndex
CREATE INDEX "Exercise_createdById_idx" ON "Exercise"("createdById");

-- CreateIndex
CREATE INDEX "TrainingProgram_teamId_idx" ON "TrainingProgram"("teamId");

-- CreateIndex
CREATE INDEX "TrainingProgram_positionGroupId_idx" ON "TrainingProgram"("positionGroupId");

-- CreateIndex
CREATE INDEX "TrainingProgram_createdById_idx" ON "TrainingProgram"("createdById");

-- CreateIndex
CREATE INDEX "TrainingBlock_programId_idx" ON "TrainingBlock"("programId");

-- CreateIndex
CREATE INDEX "ProgramExercise_blockId_idx" ON "ProgramExercise"("blockId");

-- CreateIndex
CREATE INDEX "ProgramExercise_exerciseId_idx" ON "ProgramExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "AthletePrescription_athleteId_idx" ON "AthletePrescription"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthletePrescription_programExerciseId_athleteId_key" ON "AthletePrescription"("programExerciseId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSession_teamId_idx" ON "TrainingSession"("teamId");

-- CreateIndex
CREATE INDEX "TrainingSession_programId_idx" ON "TrainingSession"("programId");

-- CreateIndex
CREATE INDEX "TrainingSession_positionGroupId_idx" ON "TrainingSession"("positionGroupId");

-- CreateIndex
CREATE INDEX "TrainingSession_status_idx" ON "TrainingSession"("status");

-- CreateIndex
CREATE INDEX "TrainingSession_currentBlockId_idx" ON "TrainingSession"("currentBlockId");

-- CreateIndex
CREATE INDEX "TrainingSession_currentProgramExerciseId_idx" ON "TrainingSession"("currentProgramExerciseId");

-- CreateIndex
CREATE INDEX "TrainingGroup_sessionId_idx" ON "TrainingGroup"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingGroup_currentBlockId_idx" ON "TrainingGroup"("currentBlockId");

-- CreateIndex
CREATE INDEX "TrainingGroup_currentProgramExerciseId_idx" ON "TrainingGroup"("currentProgramExerciseId");

-- CreateIndex
CREATE INDEX "TrainingGroupMember_groupId_idx" ON "TrainingGroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingGroupMember_sessionId_athleteId_key" ON "TrainingGroupMember"("sessionId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_sessionId_idx" ON "TrainingSet"("sessionId");

-- CreateIndex
CREATE INDEX "TrainingSet_teamId_idx" ON "TrainingSet"("teamId");

-- CreateIndex
CREATE INDEX "TrainingSet_athleteId_idx" ON "TrainingSet"("athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_exerciseId_idx" ON "TrainingSet"("exerciseId");

-- CreateIndex
CREATE INDEX "TrainingSet_programExerciseId_idx" ON "TrainingSet"("programExerciseId");

-- CreateIndex
CREATE INDEX "TrainingSet_groupId_idx" ON "TrainingSet"("groupId");

-- CreateIndex
CREATE INDEX "TrainingSet_sessionId_athleteId_idx" ON "TrainingSet"("sessionId", "athleteId");

-- CreateIndex
CREATE INDEX "TrainingSet_loggedAt_idx" ON "TrainingSet"("loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE INDEX "PlanEntitlement_planId_idx" ON "PlanEntitlement"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEntitlement_planId_key_key" ON "PlanEntitlement"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_ownerType_ownerId_key" ON "Subscription"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_ownerType_ownerId_key_periodStart_key" ON "UsageCounter"("ownerType", "ownerId", "key", "periodStart");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSportContext" ADD CONSTRAINT "AthleteSportContext_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteSportContext" ADD CONSTRAINT "AthleteSportContext_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAvailability" ADD CONSTRAINT "ProviderAvailability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAvailability" ADD CONSTRAINT "ProviderAvailability_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_followUpOfId_fkey" FOREIGN KEY ("followUpOfId") REFERENCES "CareRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutCompletion" ADD CONSTRAINT "WorkoutCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEntry" ADD CONSTRAINT "PerformanceEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEntry" ADD CONSTRAINT "PerformanceEntry_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianLink" ADD CONSTRAINT "GuardianLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmSharedWithUser" ADD CONSTRAINT "FilmSharedWithUser_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmSharedWithUser" ADD CONSTRAINT "FilmSharedWithUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightItem" ADD CONSTRAINT "HighlightItem_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "Highlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HighlightItem" ADD CONSTRAINT "HighlightItem_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionGroup" ADD CONSTRAINT "PositionGroup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionGroupMembership" ADD CONSTRAINT "PositionGroupMembership_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionGroupMembership" ADD CONSTRAINT "PositionGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPermissionGrant" ADD CONSTRAINT "TeamPermissionGrant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPermissionGrant" ADD CONSTRAINT "TeamPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamPermissionGrant" ADD CONSTRAINT "TeamPermissionGrant_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmTagDefinition" ADD CONSTRAINT "FilmTagDefinition_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmTagInstance" ADD CONSTRAINT "FilmTagInstance_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmTagInstance" ADD CONSTRAINT "FilmTagInstance_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmTagInstance" ADD CONSTRAINT "FilmTagInstance_tagDefinitionId_fkey" FOREIGN KEY ("tagDefinitionId") REFERENCES "FilmTagDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmComment" ADD CONSTRAINT "FilmComment_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmComment" ADD CONSTRAINT "FilmComment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmComment" ADD CONSTRAINT "FilmComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FilmComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnnotation" ADD CONSTRAINT "FilmAnnotation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnnotation" ADD CONSTRAINT "FilmAnnotation_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPlaylist" ADD CONSTRAINT "FilmPlaylist_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPlaylist" ADD CONSTRAINT "FilmPlaylist_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPlaylistItem" ADD CONSTRAINT "FilmPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "FilmPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPlaylistItem" ADD CONSTRAINT "FilmPlaylistItem_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPlaylistItem" ADD CONSTRAINT "FilmPlaylistItem_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignment" ADD CONSTRAINT "FilmAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignment" ADD CONSTRAINT "FilmAssignment_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignment" ADD CONSTRAINT "FilmAssignment_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignment" ADD CONSTRAINT "FilmAssignment_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "FilmPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignment" ADD CONSTRAINT "FilmAssignment_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignmentTarget" ADD CONSTRAINT "FilmAssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FilmAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAssignmentTarget" ADD CONSTRAINT "FilmAssignmentTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmReviewRequest" ADD CONSTRAINT "FilmReviewRequest_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmReviewRequest" ADD CONSTRAINT "FilmReviewRequest_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmReviewRequest" ADD CONSTRAINT "FilmReviewRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNote" ADD CONSTRAINT "CoachNote_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisTemplate" ADD CONSTRAINT "FilmAnalysisTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisCategory" ADD CONSTRAINT "FilmAnalysisCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FilmAnalysisTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisEntry" ADD CONSTRAINT "FilmAnalysisEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FilmAnalysisTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisEntry" ADD CONSTRAINT "FilmAnalysisEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FilmAnalysisCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisEntry" ADD CONSTRAINT "FilmAnalysisEntry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmAnalysisEntry" ADD CONSTRAINT "FilmAnalysisEntry_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmReport" ADD CONSTRAINT "FilmReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmReportSource" ADD CONSTRAINT "FilmReportSource_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FilmReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opponent" ADD CONSTRAINT "Opponent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReport" ADD CONSTRAINT "ScoutReport_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutReportTag" ADD CONSTRAINT "ScoutReportTag_scoutReportId_fkey" FOREIGN KEY ("scoutReportId") REFERENCES "ScoutReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmShareGrant" ADD CONSTRAINT "FilmShareGrant_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmShareGrant" ADD CONSTRAINT "FilmShareGrant_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmShareGrant" ADD CONSTRAINT "FilmShareGrant_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingSchool" ADD CONSTRAINT "RecruitingSchool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingSchool" ADD CONSTRAINT "RecruitingSchool_sportContextId_fkey" FOREIGN KEY ("sportContextId") REFERENCES "AthleteSportContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingSchool" ADD CONSTRAINT "RecruitingSchool_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingContact" ADD CONSTRAINT "RecruitingContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingContact" ADD CONSTRAINT "RecruitingContact_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "RecruitingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingContact" ADD CONSTRAINT "RecruitingContact_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingActivity" ADD CONSTRAINT "RecruitingActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingActivity" ADD CONSTRAINT "RecruitingActivity_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "RecruitingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingActivity" ADD CONSTRAINT "RecruitingActivity_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "RecruitingContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterEntry" ADD CONSTRAINT "RosterEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterChange" ADD CONSTRAINT "RosterChange_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingSignal" ADD CONSTRAINT "RecruitingSignal_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitingSignal" ADD CONSTRAINT "RecruitingSignal_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WellnessCheckIn" ADD CONSTRAINT "WellnessCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindCheckIn" ADD CONSTRAINT "MindCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGoal" ADD CONSTRAINT "AcademicGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleClassroomIntegration" ADD CONSTRAINT "GoogleClassroomIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleClassroomCourse" ADD CONSTRAINT "GoogleClassroomCourse_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GoogleClassroomIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleClassroomAssignment" ADD CONSTRAINT "GoogleClassroomAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GoogleClassroomCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleClassroomSubmission" ADD CONSTRAINT "GoogleClassroomSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "GoogleClassroomAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EligibilityChecklistItem" ADD CONSTRAINT "EligibilityChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalSafetyProfile" ADD CONSTRAINT "PersonalSafetyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyChecklistItem" ADD CONSTRAINT "SafetyChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSafetyProtocol" ADD CONSTRAINT "TeamSafetyProtocol_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSafetyProtocol" ADD CONSTRAINT "TeamSafetyProtocol_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSafetyChecklistItem" ADD CONSTRAINT "TeamSafetyChecklistItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamSafetyChecklistItem" ADD CONSTRAINT "TeamSafetyChecklistItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgram" ADD CONSTRAINT "TrainingProgram_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingBlock" ADD CONSTRAINT "TrainingBlock_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "TrainingBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramExercise" ADD CONSTRAINT "ProgramExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePrescription" ADD CONSTRAINT "AthletePrescription_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "ProgramExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePrescription" ADD CONSTRAINT "AthletePrescription_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthletePrescription" ADD CONSTRAINT "AthletePrescription_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_positionGroupId_fkey" FOREIGN KEY ("positionGroupId") REFERENCES "PositionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_currentBlockId_fkey" FOREIGN KEY ("currentBlockId") REFERENCES "TrainingBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_currentProgramExerciseId_fkey" FOREIGN KEY ("currentProgramExerciseId") REFERENCES "ProgramExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_currentBlockId_fkey" FOREIGN KEY ("currentBlockId") REFERENCES "TrainingBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroup" ADD CONSTRAINT "TrainingGroup_currentProgramExerciseId_fkey" FOREIGN KEY ("currentProgramExerciseId") REFERENCES "ProgramExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingGroupMember" ADD CONSTRAINT "TrainingGroupMember_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "ProgramExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TrainingGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSet" ADD CONSTRAINT "TrainingSet_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
