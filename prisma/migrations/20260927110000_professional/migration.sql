-- CreateTable
CREATE TABLE "ProWorkspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ProWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ProInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProTag" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ProTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProSessionMeta" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "scheduledById" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProSessionMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProSessionAudit" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "revision" INTEGER,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProSessionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProComment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProWorkspace_ownerId_idx" ON "ProWorkspace"("ownerId");

-- CreateIndex
CREATE INDEX "ProMembership_userId_revokedAt_idx" ON "ProMembership"("userId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProMembership_workspaceId_userId_role_key" ON "ProMembership"("workspaceId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ProInvite_tokenHash_key" ON "ProInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "ProInvite_workspaceId_createdAt_idx" ON "ProInvite"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ProTag_traineeId_kind_archivedAt_idx" ON "ProTag"("traineeId", "kind", "archivedAt");

-- CreateIndex
CREATE INDEX "ProTag_workspaceId_traineeId_idx" ON "ProTag"("workspaceId", "traineeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProSessionMeta_sessionId_key" ON "ProSessionMeta"("sessionId");

-- CreateIndex
CREATE INDEX "ProSessionMeta_workspaceId_scheduledAt_idx" ON "ProSessionMeta"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ProSessionMeta_traineeId_scheduledAt_idx" ON "ProSessionMeta"("traineeId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ProSessionAudit_sessionId_createdAt_idx" ON "ProSessionAudit"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProComment_sessionId_createdAt_idx" ON "ProComment"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProWorkspace" ADD CONSTRAINT "ProWorkspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProMembership" ADD CONSTRAINT "ProMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ProWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProMembership" ADD CONSTRAINT "ProMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProInvite" ADD CONSTRAINT "ProInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ProWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProInvite" ADD CONSTRAINT "ProInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProInvite" ADD CONSTRAINT "ProInvite_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProTag" ADD CONSTRAINT "ProTag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ProWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProTag" ADD CONSTRAINT "ProTag_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProTag" ADD CONSTRAINT "ProTag_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionMeta" ADD CONSTRAINT "ProSessionMeta_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionMeta" ADD CONSTRAINT "ProSessionMeta_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ProWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionMeta" ADD CONSTRAINT "ProSessionMeta_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionMeta" ADD CONSTRAINT "ProSessionMeta_scheduledById_fkey" FOREIGN KEY ("scheduledById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionAudit" ADD CONSTRAINT "ProSessionAudit_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProSessionAudit" ADD CONSTRAINT "ProSessionAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProComment" ADD CONSTRAINT "ProComment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProComment" ADD CONSTRAINT "ProComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
