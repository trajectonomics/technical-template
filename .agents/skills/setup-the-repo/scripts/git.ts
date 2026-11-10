import { $ } from "bun"
import { SetupError } from "./types"

/** The git state setup needs before it changes anything. */
export interface GitState {
	readonly rootDir: string
	/** Null on a detached HEAD. */
	readonly currentBranch: string | null
	readonly branches: readonly string[]
	readonly remoteUrl: string
}

/** The repository root; setup refuses to run outside a git repository. */
export async function getRootDir(): Promise<string> {
	try {
		const out = await $`git rev-parse --show-toplevel`.quiet().text()
		if (out.trim()) return out.trim()
	} catch {
		// Reported below, once, with the rule that failed.
	}
	throw new SetupError(
		"GIT_UNAVAILABLE",
		"Setup must run inside a git repository. Run `git init` first.",
		"git",
	)
}

/** The origin URL, or an empty string when there is no origin. */
export async function getGitRemoteUrl(): Promise<string> {
	try {
		return (await $`git remote get-url origin`.quiet().text()).trim()
	} catch {
		return ""
	}
}

/** The current branch name, or null on a detached HEAD. */
export async function currentBranch(): Promise<string | null> {
	const out = await $`git rev-parse --abbrev-ref HEAD`.quiet().text()
	const branch = out.trim()
	return branch === "HEAD" || branch.length === 0 ? null : branch
}

/** The local branch names. */
export async function localBranches(): Promise<string[]> {
	const out = await $`git branch --list "--format=%(refname:short)"`.quiet().text()
	return out
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
}

/** Reads every branch fact once, so the preflight and the commit agree. */
export async function readGitState(): Promise<GitState> {
	return {
		rootDir: await getRootDir(),
		currentBranch: await currentBranch(),
		branches: Object.freeze(await localBranches()),
		remoteUrl: await getGitRemoteUrl(),
	}
}

/** Infers `org/repo` from origin, falling back to the worktree directory name. */
export async function inferDefaultRepoName(): Promise<string> {
	const remote = await getGitRemoteUrl()
	if (remote) {
		const match = remote.match(/[:/]([^/:]+\/[^/:]+?)(?:\.git)?$/)
		if (match?.[1]) {
			const candidate = match[1].replace(/\.git$/, "")
			if (!candidate.endsWith("technical-template")) return candidate
		}
	}
	const dirName = process.cwd().split("/").pop() ?? "my-repo"
	return `trajectonomics/${dirName}`
}
