/**
 * Interactive repository bootstrapper for Trajectonomics templates.
 * Customizes package coordinates, README, GLOSSARY, AGENTS.md, CODING_STANDARDS,
 * workflows, and initial starter code, verifies build with `bun run check`,
 * self-destructs this setup skill, and reminds the user to run /setup-matt-pocock-skills.
 *
 * The generation logic is pure and lives in plan.ts and archetypes/; this file is
 * the thin effects shell: answer collection, preflight, then apply.
 */
import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { $ } from "bun"
import { parseSetupArgs } from "./args"
import { decideBranch } from "./branch"
import { applyPlan, reportPublishStatus, runEffects } from "./effects"
import { buildPlan } from "./plan"
import { readSnapshot } from "./snapshot"
import { type Archetype, type DomainTerm, type SetupAnswers, SetupError } from "./types"

const DESCRIPTION_DEFAULT = "High-performance TypeScript component for Trajectonomics"

function isValidPackageName(name: string): boolean {
	return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

async function getRootDir(): Promise<string> {
	try {
		const out = await $`git rev-parse --show-toplevel`.quiet().text()
		if (out.trim()) return out.trim()
	} catch {
		throw new SetupError("Setup must run inside a git repository. Run `git init` first.")
	}
	throw new SetupError("Setup must run inside a git repository. Run `git init` first.")
}

async function getGitRemoteUrl(): Promise<string> {
	try {
		return (await $`git remote get-url origin`.quiet().text()).trim()
	} catch {
		return ""
	}
}

async function currentBranch(): Promise<string | null> {
	const out = await $`git rev-parse --abbrev-ref HEAD`.quiet().text()
	const branch = out.trim()
	return branch === "HEAD" || branch.length === 0 ? null : branch
}

async function localBranches(): Promise<string[]> {
	const out = await $`git branch --list "--format=%(refname:short)"`.quiet().text()
	return out
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
}

async function inferDefaultRepoName(): Promise<string> {
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

async function promptUser(rl: readline.Interface, question: string, defaultVal: string): Promise<string> {
	const answer = await rl.question(`${question} [${defaultVal}]: `)
	return answer.trim() || defaultVal
}

async function ask(rl: readline.Interface, question: string): Promise<string> {
	return (await rl.question(question)).trim()
}

const ARCHETYPE_CHOICES: Readonly<Record<string, Archetype>> = {
	"1": "core",
	"2": "cli",
	"3": "service",
	"4": "minimal",
	"5": "ui-library",
}

async function chooseArchetype(rl: readline.Interface): Promise<Archetype | "other"> {
	console.log("\n4. Select Project Archetype:")
	console.log("   [1] Pure Domain Library (deterministic, no I/O, strict types, tsdown dual ESM/CJS)")
	console.log("   [2] CLI Application (executable bin, tsdown build, CLI entrypoint)")
	console.log("   [3] Backend Service / Worker (API daemon, private package)")
	console.log("   [4] Minimal TypeScript Library")
	console.log("   [5] UI Component Library (Bun workspace: pure core, Svelte 5, Storybook)")
	console.log("   [6] Other / describe your project")
	for (;;) {
		const choice = await promptUser(rl, "   Choose archetype (1-6)", "1")
		if (choice === "6") return "other"
		const archetype = ARCHETYPE_CHOICES[choice]
		if (archetype) return archetype
		console.log("   ⚠️  Choose 1, 2, 3, 4, 5 or 6.")
	}
}

async function collectTerms(rl: readline.Interface): Promise<DomainTerm[]> {
	console.log("\n6. Domain Glossary Terms (for GLOSSARY.md)")

	const terms: DomainTerm[] = []
	for (;;) {
		const question = terms.length === 0 ? "   First domain term (blank to skip): " : "   Next domain term (blank to finish): "
		const term = await ask(rl, question)
		if (term.length === 0) return terms
		let definition = await ask(rl, `   Definition for '${term}': `)
		while (definition.length === 0) {
			console.log("   ⚠️  A term needs a definition.")
			definition = await ask(rl, `   Definition for '${term}': `)
		}
		terms.push({ term, definition })
	}
}

async function collectAnswersInteractive(): Promise<SetupAnswers | null> {
	const rl = readline.createInterface({ input, output })

	console.log("\n🚀 Welcome to Trajectonomics Repository Setup!")
	console.log("This wizard will customize your repository and set up all tools.\n")

	const defaultRepo = await inferDefaultRepoName()
	const repoName = await promptUser(rl, "1. GitHub Repository Name (org/repo)", defaultRepo)

	const defaultPkgName = `@trajectonomics/${repoName.split("/").pop() ?? "project"}`
	let packageName = await promptUser(rl, "2. Package Name (for package.json)", defaultPkgName)
	while (!isValidPackageName(packageName)) {
		console.log("   ⚠️  Invalid npm package name format (must be lowercase alphanumeric/hyphens).")
		packageName = await promptUser(rl, "   Enter valid package name", defaultPkgName)
	}

	const description = await promptUser(rl, "3. Short Description", DESCRIPTION_DEFAULT)
	const archetype = await chooseArchetype(rl)
	if (archetype === "other") {
		rl.close()
		console.log(`
🛑 The script cannot scaffold an arbitrary project from a description.

   Run the \`setup-the-repo\` skill with an AI agent (e.g. /setup-the-repo) and
   describe your project there. The agent restates it in one sentence, maps it
   to the nearest Archetype, shows you what it will adapt, then runs this script
   with --no-commit and finishes the adaptation before committing.

   No files were changed.
`)
		return null
	}

	const storybook =
		archetype === "ui-library" ? await promptUser(rl, "5. Include a Storybook preview app? (y/n)", "y") : "n"
	const domainTerms = await collectTerms(rl)

	let enablePublish = false
	if (archetype !== "ui-library") {
		const defaultPublish = archetype === "core" ? "y" : "n"
		const pubChoice = await promptUser(rl, "7. Enable npm automated publishing in CI? (y/n)", defaultPublish)
		enablePublish = pubChoice.toLowerCase().startsWith("y")
	} else {
		console.log("\n   • Publishing is off for ui-library: the shared publish workflow serves one root package.")
	}

	rl.close()

	return {
		repoName,
		packageName,
		description,
		archetype,
		storybook: storybook.toLowerCase().startsWith("y"),
		domainTerms,
		enablePublish,
		coAuthors: [],
	}
}

async function main(): Promise<void> {
	const rootDir = await getRootDir()
	const remoteUrl = await getGitRemoteUrl()
	const branch = await currentBranch()
	const decision = decideBranch(branch, await localBranches())
	if (decision.error) throw new SetupError(decision.error)

	const dirName = process.cwd().split("/").pop() ?? "my-repo"
	const defaults = {
		repoName: await inferDefaultRepoName(),
		packageName: `@trajectonomics/${dirName}`,
		description: DESCRIPTION_DEFAULT,
	}
	const parsed = parseSetupArgs(Bun.argv.slice(2), defaults)

	if (remoteUrl.includes("trajectonomics/technical-template") && !parsed.force) {
		console.error("🛑 Refusing to run bootstrap setup on the template source repository itself!")
		console.error("   To test setup, clone or instantiate a new repository from this template.")
		console.error("   (Or pass --force if you specifically intend to overwrite the template repository.)")
		process.exit(1)
	}

	let answers = parsed.answers
	if (parsed.interactive && process.stdin.isTTY) {
		const collected = await collectAnswersInteractive()
		if (collected === null) return
		answers = collected
	}

	if (decision.skipCommit) {
		console.log("⚠️  Detached HEAD: scaffolding now, but leaving the commit to you.")
	}
	if (decision.switchTo) {
		console.log(`\n🌿 Switching from ${branch ?? "detached HEAD"} to ${decision.switchTo}...`)
		await $`git switch -c ${decision.switchTo}`.cwd(rootDir)
	}

	console.log("\n⚙️  Applying project customizations...")
	const plan = buildPlan(answers, readSnapshot(rootDir))
	applyPlan(rootDir, plan)
	console.log(`   ✓ Planned ${Object.keys(plan.writes).length} files and ${plan.deletes.length} deletions`)

	await runEffects({
		rootDir,
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
