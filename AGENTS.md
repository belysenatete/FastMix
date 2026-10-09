# Project instructions

Before making code changes in this workspace:

1. Read [codingPrinciples.md](codingPrinciples.md) and apply its practical guidance in the context of the user's request and any existing project architecture.
2. Read [phases.md](phases.md) for the agreed implementation sequence. Treat it as a roadmap; adapt individual tasks when implementation findings or user direction require it.
3. Read [projectDescription.md](projectDescription.md) for the goal and the full set of reference features to emulate.
4. Read [projectTracker.md](projectTracker.md) before work. Update its current phase, completed work, blockers, and next task as implementation progresses, including at the end of each coding work session.
5. For release and iteration work, consult [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) and [nextReleaseBacklog.md](nextReleaseBacklog.md); do not mark deployment readiness complete while required provider or runtime checks remain unverified.
6. The user will maintain local credentials in [credentials.md](credentials.md). Use that file only when the current task requires a credential. Do not quote, print, log, copy into source code, or otherwise expose credential values. Prefer environment variables or a secret manager for application configuration. Keep `credentials.md` out of version control.
