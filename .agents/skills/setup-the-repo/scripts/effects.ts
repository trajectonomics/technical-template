import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { $ } from "bun"
import { commitMessage } from "./commit"
import { npmStatus } from "./publish-guide"
import type { Plan, SetupAnswers } from "./types"
import { SetupError } from "./types"

/** Writes and deletes exactly the files in the plan, nothing else. */
export function applyPlan(rootDir: string, plan: Plan): void {
	for (const [path, content] of Object.entries(plan.writes)) {
		const full = join(rootDir, path)
		mkdirSync(dirname(full), { recursive: true })
		writeFileSync(full, content)
	}
	for (const path of plan.deletes) rmSync(join(rootDir, path), { force: true })
}

/** Removes the single-use skill and its Claude Code symlink. */
export function removeSetupSkill(rootDir: string): void {
	rmSync(join(rootDir, ".claude/skills/setup-the-repo"), { force: true })
	rmSync(join(rootDir, ".agents/skills/setup-the-repo"), { recursive: true, force: true })
}

/** Runs install, format and the full check, then self-destructs and commits. */
export async function runEffects(options: {
	readonly rootDir: string
	readonly answers: SetupAnswers
	readonly noCommit: boolean
	readonly skipCommit: boolean
}): Promise<void> {
	const { rootDir, answers } = options

	console.log("\n📦 Installing dependencies (`bun install`)...")
	await $`bun install`.cwd(rootDir)

	console.log("\n🎨 Formatting generated files...")
	const format = await $`bun run format`.cwd(rootDir).quiet().nothrow()
	if (format.exitCode !== 0) {
		console.error(format.stdout.toString())
		console.error(format.stderr.toString())
		throw new SetupError(
			"FORMAT_FAILED",
			"Formatting failed. Fix the error above and run setup again.",
			"format",
		)
	}

	console.log("\n🧪 Running verification suite (`bun run check`)...")
	const check = await $`bun run check`.cwd(rootDir).nothrow()
	if (check.exitCode !== 0) {
		console.error("\n❌ Verification check failed!")
		console.error(check.stdout.toString())
		console.error(check.stderr.toString())
		throw new SetupError(
			"CHECK_FAILED",
			"Verification failed. Self-destruction was aborted so you can inspect and fix the errors.",
			"check",
		)
	}
	console.log("   ✓ Full verification suite passed with 0 errors!")

	console.log("\n🧹 Removing the setup-the-repo bootstrap skill...")
	removeSetupSkill(rootDir)
	console.log("   ✓ Removed .agents/skills/setup-the-repo and its .claude symlink")

	if (options.noCommit) {
		console.log("   • --no-commit: the branch is ready; commit the changes yourself.")
	} else if (options.skipCommit) {
		console.log("   • Detached HEAD: scaffolding done; commit is left to you.")
	} else {
		await $`git -C ${rootDir} add .`.quiet()
		const commit = await $`git -C ${rootDir} commit -m ${commitMessage(answers.coAuthors)}`
			.quiet()
			.nothrow()
		if (commit.exitCode !== 0) {
			console.error(commit.stdout.toString())
			console.error(commit.stderr.toString())
			throw new SetupError(
				"COMMIT_FAILED",
				"The bootstrap commit failed. The files are written; commit them yourself.",
				"commit",
			)
		}
		console.log("   ✓ Created the bootstrap commit")
	}

	printSummary(answers)
}

function printSummary(answers: SetupAnswers): void {
	const releaseNote =
		answers.archetype === "ui-library"
			? `
📦 RELEASING: this workspace ships with publishing off. The shared publish workflow
   serves one package from the repository root and cannot serve a Bun workspace. Add
   one release workflow per package when needed; trajectonomics/design-system's
   release-*.yml files are the reference until trajectonomics/cicd ships a
   multi-package pipeline.
`
			: ""
	console.log(`\n${"=".repeat(78)}`)
	console.log("🎉 REPOSITORY SETUP COMPLETE!")
	console.log("=".repeat(78))
	console.log(`
Your repository '${answers.repoName}' (${answers.packageName}) is now fully
configured, built, and verified.

The single-use bootstrap skill 'setup-the-repo' has removed itself.
${releaseNote}
👉 IMPORTANT NEXT STEP:
   Set up Matt Pocock's skills and issue tracker workflow for this repo:

   Run the skill:
   /setup-matt-pocock-skills

   This will:
   1. Connect your issue tracker (GitHub Issues with the \`gh\` CLI).
   2. Configure canonical triage labels (needs-triage, ready-for-agent, etc.).
   3. Establish domain document rules for autonomous agents.

After that, push the branch and open a pull request with a conventional-commit
title, then pick or create your first issue with /to-tickets or /pick-the-issue!
`)
	console.log(`${"=".repeat(78)}\n`)
}

/** Reports whether the package is already on npm; read-only. */
export async function reportPublishStatus(packageName: string): Promise<void> {
	console.log("📦 PUBLISH SETUP: the package is not on npm until you finish docs/publishing.md")
	for (const line of await npmStatus(packageName)) console.log(`   - ${line}`)
	console.log("   - Next: sign in to npm, publish the first alpha locally, then switch to")
	console.log("     trusted publishing (docs/publishing.md has the exact commands).\n")
}
