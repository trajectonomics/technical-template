import type { SetupErrorCode } from "./types"

/** What setup should do about the branch it found. */
export interface BranchDecision {
	/** Branch to create before any file changes, or null to stay put. */
	readonly switchTo: string | null
	/** True on a detached HEAD: scaffold, but leave the commit to the caller. */
	readonly skipCommit: boolean
	/** A precondition failure; setup must stop before changing anything. */
	readonly error: string | null
	/** The rule that failed, so callers do not parse the message. */
	readonly errorCode: SetupErrorCode | null
}

/** The branch setup creates so AGENTS.md rule 1 holds from the first commit. */
export const BOOTSTRAP_BRANCH = "feat/bootstrap"

/** Decides whether setup may start and which branch it uses. */
export function decideBranch(
	currentBranch: string | null,
	branches: readonly string[],
): BranchDecision {
	if (currentBranch === null) {
		return Object.freeze({ switchTo: null, skipCommit: true, error: null, errorCode: null })
	}
	if (currentBranch === "main" || currentBranch === "master") {
		if (branches.includes(BOOTSTRAP_BRANCH)) {
			return Object.freeze({
				switchTo: null,
				skipCommit: false,
				error: `Branch ${BOOTSTRAP_BRANCH} already exists. Delete it, or run setup from a branch you own.`,
				errorCode: "BOOTSTRAP_BRANCH_EXISTS",
			})
		}
		return Object.freeze({
			switchTo: BOOTSTRAP_BRANCH,
			skipCommit: false,
			error: null,
			errorCode: null,
		})
	}
	return Object.freeze({ switchTo: null, skipCommit: false, error: null, errorCode: null })
}
