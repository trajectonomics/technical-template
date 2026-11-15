import type { PlanInput } from "../../types"
import { gitignore, SVELTE_RULE_4 } from "./root"

/** The root Biome exclusions the harness needs: Playwright writes a report and a trace folder. */
export const VISUAL_BIOME_EXCLUDES = ["!**/playwright-report", "!**/test-results"] as const

/** The README Development lines that document both visual commands. */
export const VISUAL_README_LINES =
	"\n# Install Chromium once, then screenshot the built Storybook and compare it\n" +
	"# to the committed baselines\nbun x --cwd apps/storybook playwright install chromium\n" +
	"bun run test:visual\n\n# Regenerate those baselines after an intended visual change\n" +
	"bun run test:visual:update\n"

/** AGENTS.md rule 4 for a workspace that also screenshots its Storybook. */
export function svelteRule4Visual(): string {
	return (
		`${SVELTE_RULE_4} Run \`bun run test:visual\` after a component change: it screenshots the ` +
		"built Storybook against the committed baselines."
	)
}

/** The template .gitignore plus the folders the visual harness writes. */
export function visualGitignore(input: PlanInput): string {
	const lines = gitignore(input).trimEnd().split("\n")
	for (const addition of ["playwright-report/", "test-results/"]) {
		if (!lines.includes(addition)) lines.push(addition)
	}
	return `${lines.filter(Boolean).join("\n")}\n`
}
