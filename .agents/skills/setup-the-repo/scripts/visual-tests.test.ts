import { describe, expect, it } from "bun:test"
import { buildPlan } from "./plan"
import { templateSnapshot, testAnswers } from "./testing"
import {
	STARTER_BASELINES,
	VISUAL_FONT_LICENCE,
	VISUAL_SNAPSHOT_APP_DIR,
} from "./archetypes/ui-library/visual-assets"

const snapshot = templateSnapshot()

function planFor(storybook: boolean) {
	return buildPlan(
		testAnswers({ archetype: "ui-library", enablePublish: false, storybook }),
		snapshot,
	)
}

const HARNESS_FILES = [
	"apps/storybook/playwright.config.ts",
	"apps/storybook/e2e/visual.e2e.ts",
	"apps/storybook/scripts/serve-static.ts",
	".github/workflows/browser.yml",
	"docs/adr/0003-visual-regression.md",
]

describe("the ui-library visual harness", () => {
	const plan = planFor(true)

	it.each(HARNESS_FILES)("writes %s", (path) => {
		expect(plan.writes[path]).toBeDefined()
	})

	it("copies the pinned fonts and the starter baselines", () => {
		const copies = plan.copies ?? {}
		for (const font of [
			"LiberationSans-Regular.ttf",
			"LiberationSans-Bold.ttf",
			VISUAL_FONT_LICENCE,
		]) {
			expect(Object.keys(copies)).toContain(`apps/storybook/e2e/fonts/${font}`)
		}
		for (const baseline of STARTER_BASELINES) {
			expect(Object.keys(copies)).toContain(`apps/storybook/${VISUAL_SNAPSHOT_APP_DIR}/${baseline}`)
		}
		expect(Object.keys(copies)).toHaveLength(3 + STARTER_BASELINES.length)
	})

	it("pins Playwright and both visual commands on the app and the root", () => {
		const app = JSON.parse(plan.writes["apps/storybook/package.json"] ?? "{}")
		expect(app.devDependencies["@playwright/test"]).toBe("1.65.0")
		expect(app.scripts["test:visual"]).toContain("bun run build")
		expect(app.scripts["test:visual:update"]).toContain("--update-snapshots")

		const tsconfig = JSON.parse(plan.writes["apps/storybook/tsconfig.json"] ?? "{}")
		expect(tsconfig.compilerOptions.types).toContain("bun")
		expect(tsconfig.include).toEqual(
			expect.arrayContaining(["e2e/**/*.ts", "playwright.config.ts", "scripts/**/*.ts"]),
		)

		const root = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(root.scripts["test:visual"]).toContain("--filter '@trajectonomics/example-storybook'")
		expect(root.scripts["test:visual:update"]).toContain("test:visual:update")
	})

	it("identifies the starter story by its exact title, never by an id prefix", () => {
		const e2e = plan.writes["apps/storybook/e2e/visual.e2e.ts"] ?? ""
		expect(e2e).toContain('const STARTER_TITLE = "Components/Invoice"')
		expect(e2e).not.toContain('startsWith("components-")')
		expect(plan.writes["apps/storybook/playwright.config.ts"]).toContain(
			`snapshotDir: "${VISUAL_SNAPSHOT_APP_DIR}"`,
		)
	})

	it("names each case by story title, so two stories called Default cannot collide", () => {
		const e2e = plan.writes["apps/storybook/e2e/visual.e2e.ts"] ?? ""
		expect(e2e).toContain("${story.title} ${story.name} in the ${theme} theme")
		expect(e2e).toContain("test(`the ${viewportName} viewport`")
	})

	it("records the decision in ADR 0003 and amends the test-runner count", () => {
		const adr = plan.writes["docs/adr/0003-visual-regression.md"] ?? ""
		expect(adr).toContain("Playwright")
		expect(adr).toContain("ADR 0002")
	})

	it("documents the commands and mentions them in AGENTS.md rule 4", () => {
		expect(plan.writes["README.md"]).toContain("bun run test:visual:update")
		expect(plan.writes["AGENTS.md"]).toContain("bun run test:visual")
	})

	it("ignores the Playwright output folders in git and in Biome", () => {
		expect(plan.writes[".gitignore"]).toContain("playwright-report/")
		expect(plan.writes[".gitignore"]).toContain("test-results/")
		expect(plan.writes["biome.json"]).toContain("!**/playwright-report")
		expect(plan.writes["biome.json"]).toContain("!**/test-results")
	})

	it("keeps bun run check free of the browser", () => {
		const root = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(root.scripts.check).not.toContain("test:visual")
	})
})

describe("the ui-library plan without Storybook", () => {
	const plan = planFor(false)

	it.each(HARNESS_FILES)("writes no %s", (path) => {
		expect(plan.writes[path]).toBeUndefined()
	})

	it("writes no visual scripts, copies, plugin pin or output-folder mentions", () => {
		expect(plan.copies).toEqual({})
		const root = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(root.scripts["test:visual"]).toBeUndefined()
		expect(plan.writes["README.md"]).not.toContain("test:visual")
		expect(plan.writes["AGENTS.md"]).not.toContain("test:visual")
		expect(plan.writes[".gitignore"]).not.toContain("playwright-report/")
		expect(plan.writes["biome.json"]).not.toContain("playwright-report")
		expect(plan.writes["README.md"]).not.toContain("apps/storybook")
	})
})
