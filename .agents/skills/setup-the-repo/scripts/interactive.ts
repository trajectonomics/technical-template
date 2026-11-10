import * as readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { inferDefaultRepoName } from "./git"
import type { Archetype, DomainTerm, SetupAnswers } from "./types"

const DESCRIPTION_DEFAULT = "High-performance TypeScript component for Trajectonomics"

function isValidPackageName(name: string): boolean {
	return /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

async function promptUser(
	rl: readline.Interface,
	question: string,
	defaultVal: string,
): Promise<string> {
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
		const question =
			terms.length === 0
				? "   First domain term (blank to skip): "
				: "   Next domain term (blank to finish): "
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

/** Runs the questionnaire; null means the user chose "Other" and nothing changed. */
export async function collectAnswersInteractive(): Promise<SetupAnswers | null> {
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
		archetype === "ui-library"
			? await promptUser(rl, "5. Include a Storybook preview app? (y/n)", "y")
			: "n"
	const domainTerms = await collectTerms(rl)

	let enablePublish = false
	if (archetype !== "ui-library") {
		const defaultPublish = archetype === "core" ? "y" : "n"
		const pubChoice = await promptUser(
			rl,
			"7. Enable npm automated publishing in CI? (y/n)",
			defaultPublish,
		)
		enablePublish = pubChoice.toLowerCase().startsWith("y")
	} else {
		console.log(
			"\n   • Publishing is off for ui-library: the shared publish workflow serves one root package.",
		)
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
