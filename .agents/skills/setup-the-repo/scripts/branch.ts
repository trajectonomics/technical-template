/** What setup should do about the branch it found. */
export interface BranchDecision {
	/** Branch to create before any file changes, or null to stay put. */
	readonly switchTo: string | null
	/** True on a detached HEAD: scaffold, but leave the commit to the caller. */
	readonly skipCommit: boolean
	/** A precondition failure; setup must stop before changing anything. */
	readonly error: string | null
}

/** The branch setup creates so AGENTS.md rule 1 holds from the first commit. */
export const BOOTSTRAP_BRANCH = "feat/bootstrap"

/**
 * Decides whether setup may start and on which branch. `currentBranch` is null
 * on a detached HEAD; `branches` lists the local branch names.
 */
export function decideBranch(
	currentBranch: string | null,
	branches: readonly string[],
): BranchDecision {
	if (currentBranch === null) {
		return { switchTo: null, skipCommit: true, error: null }
	}
	if (currentBranch === "main" || currentBranch === "master") {
		if (branches.includes(BOOTSTRAP_BRANCH)) {
			return {
				switchTo: null,
				skipCommit: false,
				error: `Branch ${BOOTSTRAP_BRANCH} already exists. Delete it, or run setup from a branch you own.`,
			}
		}
		return { switchTo: BOOTSTRAP_BRANCH, skipCommit: false, error: null }
	}
	return { switchTo: null, skipCommit: false, error: null }
}
