import { VISUAL_SNAPSHOT_APP_DIR } from "./visual-assets"

/** The devDependency the harness needs, pinned exactly like `trajectonomics/site`. */
export const VISUAL_DEV_DEPENDENCIES: Readonly<Record<string, string>> = {
	"@playwright/test": "1.65.0",
}

/** The port the Playwright config and the static server both use. */
const VISUAL_PORT = 8793

/** The app scripts: both rebuild Storybook first, so `storybook-static/index.json` exists. */
export function visualScripts(): Record<string, string> {
	return {
		"test:visual": "bun run build && playwright test",
		"test:visual:update": "bun run build && playwright test --update-snapshots",
	}
}

/** The root scripts that delegate to the workspace's Storybook app. */
export function visualRootScripts(packageName: string): Record<string, string> {
	const app = `${packageName}-storybook`
	return {
		"test:visual": `bun run --filter '${app}' test:visual`,
		"test:visual:update": `bun run --filter '${app}' test:visual:update`,
	}
}

/** The Playwright config and the Bun static server the visual tests run against. */
export function visualHarness(): Record<string, string> {
	return {
		"apps/storybook/playwright.config.ts": playwrightConfig(),
		"apps/storybook/scripts/serve-static.ts": serveStatic(),
	}
}

function playwrightConfig(): string {
	return `import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test"

/** The port scripts/serve-static.ts listens on, so the config and the server agree. */
const PORT = ${VISUAL_PORT}
const BASE_URL = \`http://127.0.0.1:\${PORT}\`

/**
 * The visual regression checks of the built Storybook (ADR 0003). The baselines under
 * e2e/visual-snapshots are committed, so an unintended pixel change fails the browser workflow;
 * regenerate them with \`bun run test:visual:update\` after an intended one.
 */
const config: PlaywrightTestConfig = defineConfig({
	testDir: "e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	retries: 0,
	reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
	snapshotDir: "${VISUAL_SNAPSHOT_APP_DIR}",
	snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
	expect: {
		toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 },
	},
	use: { baseURL: BASE_URL, trace: "retain-on-failure", reducedMotion: "reduce" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "bun scripts/serve-static.ts",
		url: \`\${BASE_URL}/iframe.html\`,
		reuseExistingServer: false,
		timeout: 60_000,
	},
})

export default config
`
}

function serveStatic(): string {
	return `/**
 * Serves the built Storybook for the visual tests; Playwright's webServer starts it. Bun-only, so
 * the harness adds no dependency to serve a folder.
 */
const PORT = ${VISUAL_PORT}
const ROOT = "storybook-static"

const server: ReturnType<typeof Bun.serve> = Bun.serve({
	port: PORT,
	hostname: "127.0.0.1",
	async fetch(request) {
		const url = new URL(request.url)
		const path = decodeURIComponent(url.pathname).replace(/^\\/+/, "") || "index.html"
		if (path.includes("..")) return new Response("Not found", { status: 404 })
		const file = Bun.file(\`\${ROOT}/\${path}\`)
		if (!(await file.exists())) return new Response("Not found", { status: 404 })
		return new Response(file)
	},
})

console.log(\`Serving \${ROOT} on http://127.0.0.1:\${server.port}\`)
`
}
