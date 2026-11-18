import { glossaryContent } from "../terms"
import { publishChecklist } from "../publish-guide"
import type { PackageJson, PlanInput, SetupAnswers } from "../types"
import { SetupError } from "../types"

/** Serializes a JSON file the way Biome formats it. */
export function json(value: unknown): string {
	return `${JSON.stringify(value, null, "\t")}\n`
}

/** The parsed package.json from the snapshot; a missing one is a broken template. */
export function readPackage(input: PlanInput): PackageJson {
	const raw = input.snapshot.files["package.json"]
	if (!raw) throw new Error("The template snapshot has no package.json.")
	return JSON.parse(raw) as PackageJson
}

/** A copy of the template package.json with coordinates and setup scripts replaced. */
export function basePackage(input: PlanInput): PackageJson {
	const answers = input.answers
	const pkg = structuredClone(readPackage(input))
	pkg.name = answers.packageName
	pkg.description = answers.description
	pkg.repository = { type: "git", url: `git+https://github.com/${answers.repoName}.git` }
	if (pkg.scripts) {
		delete pkg.scripts["setup"]
		delete pkg.scripts["verify:setup"]
	}
	return pkg
}

/** The two README sections that differ per Archetype. */
export interface ReadmeParts {
	readonly install: string
	readonly usage: string
	readonly extra?: string
	/** The command a contributor runs for the package tests. */
	readonly testCommand?: string
	/** Extra Development lines, such as the visual regression commands. */
	readonly visualLines?: string
}

/** The README the generated repository keeps. */
export function readmeContent(input: PlanInput, parts: ReadmeParts): string {
	const answers = input.answers
	const testCommand = parts.testCommand ?? "bun test"
	const publishLine = answers.enablePublish
		? "- [docs/publishing.md](./docs/publishing.md): First npm publish and trusted publishing checklist.\n"
		: ""
	return `# ${answers.packageName}

${answers.description}

[![CI](https://github.com/${answers.repoName}/actions/workflows/ci.yml/badge.svg)](https://github.com/${answers.repoName}/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Part of the [Trajectonomics](https://github.com/trajectonomics) ecosystem.

---

${parts.install}

${parts.usage}

${parts.extra ?? ""}---

## Development

\`\`\`bash
# Install dependencies
bun install

# Run full verification suite (lint, typecheck, tests, build)
bun run check

# Run tests
${testCommand}
${parts.visualLines ?? ""}
# Code formatting & lint
bun run format
bun run lint
\`\`\`

---

## Domain Documentation

- [GLOSSARY.md](./GLOSSARY.md): Ubiquitous domain terminology.
- [AGENTS.md](./AGENTS.md): Guidelines and rules for autonomous AI coding agents.
- [CODING_STANDARDS.md](./CODING_STANDARDS.md): Architecture, purity, and review invariants.
- [docs/adr/](./docs/adr/): Architecture Decision Records.
${publishLine}---

## License

[MIT](./LICENSE)
`
}

/** The heading that marks the template's single-use setup checklist. */
const CHECKLIST_HEADING = "## Checklist When Instantiating a New Repo"

/** The failure for a template text the generator rewrites but no longer finds. */
function templateDrift(anchor: string): SetupError {
	return new SetupError(
		"TEMPLATE_AGENTS_DRIFT",
		`The template's AGENTS.md no longer contains ${anchor}, so the generated file cannot be built from it.`,
	)
}

/** Replaces one template text, or fails naming the anchor that vanished. */
function replaceTemplate(
	content: string,
	pattern: RegExp,
	replacement: string,
	anchor: string,
): string {
	if (!pattern.test(content)) throw templateDrift(anchor)
	return content.replace(pattern, () => replacement)
}

/** Puts the repository answers where the checklist was, keeping every section below it. */
function replaceChecklist(content: string, answers: SetupAnswers): string {
	const start = content.indexOf(CHECKLIST_HEADING)
	if (start < 0) throw templateDrift("the setup checklist")
	const next = content.indexOf("\n## ", start)
	const end = next < 0 ? content.length : next + 1
	const information = `## Repository Information\n\n- Repository: https://github.com/${answers.repoName}\n- Package: \`${answers.packageName}\`\n\n`
	return `${content.slice(0, start)}${information}${content.slice(end)}`
}

/** The AGENTS.md the generated repository keeps; `rule4` replaces the Bun rule. */
export function agentsContent(input: PlanInput, rule4?: string): string {
	const answers = input.answers
	const original = input.snapshot.files["AGENTS.md"]
	if (!original) throw templateDrift("the AGENTS.md file")
	let content = replaceTemplate(
		original,
		/Instructions for AI coding agents working in `[^`]*` repositories instantiated from this template\./,
		`Instructions for AI coding agents in \`${answers.repoName}\` (\`${answers.packageName}\`).`,
		"the intro line",
	)
	if (rule4) {
		content = replaceTemplate(
			content,
			/4\. Bun only: `bun install`, `bun test`, `bun run <script>`\. Do not add npm\/pnpm\/yarn lockfiles\./,
			`4. ${rule4}`,
			"rule 4",
		)
	}
	// Setup deletes the skill and its script, so the generated file must not name them.
	content = replaceTemplate(
		content,
		/^- \*\*Bootstrap Skill \(`setup-the-repo`\)\*\*: .*\n/m,
		"",
		"the bootstrap bullet",
	)
	return replaceChecklist(content, answers)
}

/** The ADR every single-package Archetype records. */
export function singlePackageAdr(input: PlanInput): string {
	const answers = input.answers
	return `# ADR 0001: Architecture Foundations for ${answers.packageName}

## Status

Accepted

## Context

\`${answers.repoName}\` is established to provide ${answers.description}.
It is built with Bun, TypeScript, and Biome under the Trajectonomics architectural guidelines.

## Decision

1. **Archetype**: Configured as \`${answers.archetype}\`.
2. **Language & Runtime**: TypeScript (strict mode with \`isolatedDeclarations\`) executed on Bun.
3. **Domain Integrity**: All domain concepts adhere to [GLOSSARY.md](../../GLOSSARY.md).
4. **Agent Collaboration**: AI agents adhere to [AGENTS.md](../../AGENTS.md) and [CODING_STANDARDS.md](../../CODING_STANDARDS.md).

## Consequences

- Invariants remain verifiable through deterministic tests (\`bun test\`) and \`bun run check\`.
- All autonomous agent work is test-first and reviewed against established coding standards.
`
}

/** The type-check config for the generated single-package repository. */
export function singlePackageTestTsconfig(): string {
	return json({
		extends: "./tsconfig.base.json",
		compilerOptions: {
			lib: ["ES2022"],
			types: ["bun"],
			isolatedDeclarations: false,
		},
		include: ["src", "scripts"],
	})
}

/** Files every Archetype writes, whatever its layout. */
export function commonWrites(
	input: PlanInput,
	parts: ReadmeParts,
	rule4?: string,
): Record<string, string> {
	const writes: Record<string, string> = {
		"README.md": readmeContent(input, parts),
		"GLOSSARY.md": glossaryContent(input.answers),
		"AGENTS.md": agentsContent(input, rule4),
	}
	// The skill deletes itself, so the repo must keep the first-publish guide.
	if (input.answers.enablePublish) {
		writes["docs/publishing.md"] = publishChecklist(
			input.answers.packageName,
			input.answers.repoName,
		)
	}
	return writes
}

/** The template ADR that every Archetype replaces. */
export const TEMPLATE_ADR = "docs/adr/0001-template-architecture-decisions.md"

/** The template-only workflow that proves this skill still scaffolds a working repository. */
export const SETUP_VERIFY_WORKFLOW = ".github/workflows/verify-setup.yml"
