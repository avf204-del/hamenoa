// ייצוא הנתונים האישיים (החלטה 35, D-12): קובץ JSON אחד להורדה.
//
// כל שאילתה כאן מסוננת ב-userId של הבקשה — גם SwapEvent, שאין לו עמודת
// userId משלו ולכן מסונן דרך האימון שאליו הוא שייך. הבנייה עצמה טהורה
// (src/lib/export.ts) ובוררת שדות במפורש, כך ש-googleSub לא יכול לדלוף.

import { NextResponse } from "next/server";
import { userGate } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { buildExport, exportFilename } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await userGate();
  if ("response" in gate) return gate.response;
  const { userId } = gate;

  const [
    user,
    calibrations,
    locations,
    sessions,
    swapEvents,
    benchmarks,
    feedback,
    legalAcceptances,
    usageEvents,
    experienceProfile,
    experienceSessions,
    experienceFeedback,
    experienceAwards,
    challengeMembers,
    matchParticipants,
    gameState, gameRuns, gameLedger, exerciseTracks, exerciseLoadState,
    proWorkspacesOwned, proMemberships, proInvitesCreated, proTags, proSessionMetas, proAudits, proAuthoredAudits, proComments,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
        email: true,
        signupSource: true,
        disclaimerAcceptedAt: true,
        legalVersion: true,
        healthScreenedAt: true,
        healthScreenVersion: true,
        healthFlagged: true,
        healthAnswers: true,
        trainingPreferences: true,
        displayName: true,
      },
    }),
    prisma.userCalibration.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.locationProfile.findMany({ where: { userId }, orderBy: { kind: "asc" } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: {
        blocks: { orderBy: { order: "asc" }, include: { setLogs: true } },
        writeReceipts:{orderBy:{createdAt:'asc'}},movementReceipts:{orderBy:{createdAt:'asc'}},
      },
    }),
    prisma.swapEvent.findMany({
      where: { session: { userId } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.benchmark.findMany({ where: { userId }, include: { results: true } }),
    prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.legalAcceptance.findMany({
      where: { userId },
      orderBy: { acceptedAt: "asc" },
    }),
    // אירועי המדידה הפנימית (D-8). המדיניות מונה אותם כמידע שנאסף, ולכן
    // הם חלק מהייצוא (ביקורת סבב 35, LEGAL-4). בלי `id` ובלי `visitId`:
    // מזהים פנימיים שאין להם משמעות אצל המשתמש.
    prisma.pilotEvent.findMany({
      where: { userId },
      select: { name: true, path: true, props: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // חוויית האימון (C1): כל הטבלאות החדשות, מסוננות ב-userId
    prisma.experienceProfile.findUnique({ where: { userId } }),
    prisma.experienceSession.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.experienceFeedback.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.experienceAward.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    // החלטה 47: האתגרים והזירות — רק השורות של המשתמש, בלי משתתפים אחרים
    prisma.challengeMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: {
        joinedAt: true,
        challenge: { select: { title: true, kind: true, benchmarkSlug: true, startDay: true, endDay: true, endedAt: true, createdById: true } },
      },
    }),
    prisma.matchParticipant.findMany({
      where: { userId },
      orderBy: { joinedAt: "asc" },
      select: {
        joinedAt: true,
        role: true,
        teamId: true,
        captain: true,
        picks: true,
        jokerEvent: true,
        match: { select: { createdAt: true, endedAt: true, phase: true, hostId: true, program: true } },
        results: { select: { eventIndex: true, value: true, status: true, by: true, confirmedAt: true } },
      },
    }),
    prisma.gameState.findUnique({ where: { userId } }),
    prisma.gameRun.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.gameLedger.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.exerciseTrack.findMany({ where: { userId }, orderBy: [{ slug: "asc" }, { band: "asc" }] }),
    prisma.exerciseLoadState.findUnique({ where: { userId } }),
    prisma.proWorkspace.findMany({ where: { ownerId: userId }, select: { id: true, name: true, kind: true, timezone: true, equipment: true, createdAt: true, archivedAt: true } }),
    prisma.proMembership.findMany({ where: { userId }, include: { workspace: { select: { name: true, kind: true } } } }),
    prisma.proInvite.findMany({ where: { createdById: userId }, select: { id: true, workspaceId: true, role: true, createdAt: true, expiresAt: true, acceptedAt: true, revokedAt: true } }),
    prisma.proTag.findMany({ where: { OR: [{ traineeId: userId }, { authorId: userId }] }, select: { id: true, workspaceId: true, traineeId: true, authorId: true, kind: true, code: true, label: true, createdAt: true, archivedAt: true } }),
    prisma.proSessionMeta.findMany({ where: { traineeId: userId }, select: { id: true, sessionId: true, workspaceId: true, timezone: true, scheduledAt: true, cancelledAt: true } }),
    prisma.proSessionAudit.findMany({ where: { session: { userId } }, select: { id: true, sessionId: true, actorId: true, action: true, revision: true, before: true, after: true, createdAt: true } }),
    prisma.proSessionAudit.findMany({ where: { actorId: userId, session: { userId: { not: userId } } }, select: { id: true, sessionId: true, actorId: true, action: true, revision: true, createdAt: true } }),
    prisma.proComment.findMany({ where: { OR: [{ session: { userId } }, { authorId: userId }] }, select: { id: true, sessionId: true, authorId: true, body: true, createdAt: true } }),
  ]);

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "לא נמצאו נתונים לייצוא" },
      { status: 404 },
    );
  }

  const capacityProfile=await prisma.capacityProfile.findUnique({where:{userId}});
  const payload = buildExport({
    capacity:capacityProfile,
    user,
    calibrations,
    locations,
    sessions,
    swapEvents,
    benchmarks,
    feedback,
    legalAcceptances,
    usageEvents,
    game: { state: gameState, runs: gameRuns, ledger: gameLedger },
    loadProgression: { tracks: exerciseTracks, state: exerciseLoadState },
    professional: { workspacesOwned: proWorkspacesOwned, memberships: proMemberships, invitesCreated: proInvitesCreated, tags: proTags, sessionMetas: proSessionMetas, audits: [...proAudits, ...proAuthoredAudits], comments: proComments },
    experience: {
      profile: experienceProfile,
      sessions: experienceSessions,
      feedback: experienceFeedback,
      awards: experienceAwards,
    },
    social: {
      displayName: user.displayName,
      challenges: challengeMembers.map(({ challenge: { createdById, ...c }, joinedAt }) => ({ ...c, joinedAt, isCreator: createdById === userId })),
      matches: matchParticipants.map(({ match: { hostId, ...m }, ...p }) => ({ ...m, isHost: hostId === userId, ...p })),
    },
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename()}"`,
      "cache-control": "no-store",
    },
  });
}
