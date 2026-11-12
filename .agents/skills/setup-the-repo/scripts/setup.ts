/**
 * Repository bootstrapper for Trajectonomics templates.
 *
 * The generation logic is pure and lives in plan.ts, archetypes/ and starters/;
 * this file is the effects shell: preflight, answers, then apply.
 */
import { $ } from "bun"
import { parseSetupArgs } from "./args"
import { decideBranch } from "./branch"
import { applyPlan, reportPublishStatus, runEffects } from "./effects"
import { inferDefaultRepoName, readGitState } from "./git"
import { collectAnswersInteractive } from "./interactive"
import { buildPlan } from "./plan"
import { readSnapshot } from "./snapshot"
import { SetupError } from "./types"

const DESCRIPTION_DEFAULT = "High-performance TypeScript component for Trajectonomics"

async function main(): Promise<void> {
	const git = await readGitState()
	const decision = decideBranch(git.currentBranch, git.branches)
	if (decision.error) {
		throw new SetupError(decision.errorCode ?? "BOOTSTRAP_BRANCH_EXISTS", decision.error, "branch")
	}

	const dirName = process.cwd().split("/").pop() ?? "my-repo"
	const defaults = {
		repoName: await inferDefaultRepoName(),
		packageName: `@trajectonomics/${dirName}`,
		description: DESCRIPTION_DEFAULT,
	}
	const parsed = parseSetupArgs(Bun.argv.slice(2), defaults)

	if (git.remoteUrl.includes("trajectonomics/technical-template") && !parsed.force) {
		console.error("🛑 Refusing to run bootstrap setup on the template source repository itself!")
		console.error("   To test setup, clone or instantiate a new repository from this template.")
		console.error("   (Or pass --force if you specifically intend to overwrite the template repository.)")
		process.exit(1)
	}

	let answers = parsed.answers
	if (parsed.interactive && process.stdin.isTTY) {
		const collected = await collectAnswersInteractive()
		if (collected === null) return
		// --co-author works in a TTY run too: the questionnaire only owns its own fields.
		answers = { ...collected, coAuthors: parsed.answers.coAuthors }
	}

	// Build the whole plan before touching anything: a planner failure leaves the repo as it was.
	const plan = buildPlan(answers, readSnapshot(git.rootDir))

	if (decision.skipCommit) {
		console.log("⚠️  Detached HEAD: scaffolding now, but leaving the commit to you.")
	}
	if (decision.switchTo) {
		console.log(`\n🌿 Switching from ${git.currentBranch ?? "detached HEAD"} to ${decision.switchTo}...`)
		await $`git switch -c ${decision.switchTo}`.cwd(git.rootDir)
	}

	console.log("\n⚙️  Applying project customizations...")
	applyPlan(git.rootDir, plan)
	console.log(
		`   ✓ Planned ${Object.keys(plan.writes).length} files and ${plan.deletes.length} deletions`,
	)

	await runEffects({
		rootDir: git.rootDir,
		answers,
		noCommit: parsed.noCommit,
		skipCommit: decision.skipCommit,
	})

	if (answers.enablePublish) await reportPublishStatus(answers.packageName)
}

if (import.meta.main) {
	try {
		await main()
	} catch (error) {
		if (error instanceof SetupError) {
			console.error(`\n❌ ${error.message}`)
			process.exit(1)
		}
		throw error
	}
}
