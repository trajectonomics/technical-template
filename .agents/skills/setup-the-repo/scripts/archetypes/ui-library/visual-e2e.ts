/** The generated screenshot test: every story, both themes, desktop and mobile. */
export function visualStoryTest(): Record<string, string> {
	return { "apps/storybook/e2e/visual.e2e.ts": VISUAL_E2E }
}

const VISUAL_E2E = `import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"

/** The viewports the screenshots cover: the desktop the checks run at, and a phone. */
const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const

/** The themes the screenshots cover, as the colour scheme Playwright sets. */
const THEMES = ["light", "dark"] as const

/** The label the starter story renders, so its baseline never depends on the first glossary term. */
const STARTER_LABEL = "Starter"

/** One story the built Storybook exports. */
interface Story {
	readonly id: string
	readonly name: string
}

/** The stories in storybook-static/index.json; docs entries are not screenshotted. */
function readStories(): readonly Story[] {
	const raw = readFileSync("storybook-static/index.json", "utf8")
	const index = JSON.parse(raw) as { entries?: Record<string, Story & { type?: string }> }
	return Object.values(index.entries ?? {}).filter((entry) => entry.type === "story")
}

/** The scaffold's starter story: the only story whose id is Components/...--Default. */
function isStarter(story: Story): boolean {
	return story.id.startsWith("components-") && story.id.endsWith("--default")
}

/** The baseline slug: the starter's canonical name, because its id carries the first term. */
function slug(story: Story): string {
	return (isStarter(story) ? "starter" : story.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** The page colours per theme: the starter component sets none of its own. */
const THEME_CSS = {
	light: "html, body { background: #ffffff; color: #111111; }",
	dark: "html, body { background: #111111; color: #f5f5f5; }",
} as const

/** The fonts every screenshot renders with, so the runner's own fonts are never used. */
const FONT_CSS = \`
@font-face { font-family: "Visual Sans"; src: url("/e2e-fonts/LiberationSans-Regular.ttf"); font-weight: 400; }
@font-face { font-family: "Visual Sans"; src: url("/e2e-fonts/LiberationSans-Bold.ttf"); font-weight: 700; }
html, body { font-family: "Visual Sans", sans-serif; }
\`

/** Serve the committed fonts from e2e/fonts, so every runner renders the snapshots alike. */
async function pinFonts(page: Page): Promise<void> {
	const fonts = fileURLToPath(new URL("./fonts", import.meta.url))
	await page.route("**/e2e-fonts/*", (route) => {
		const name = route.request().url().split("/").pop() ?? ""
		return route.fulfill({ path: \`\${fonts}/\${name}\`, contentType: "font/ttf" })
	})
}

/** The story URL; the fixed label is passed only to the starter story. */
function storyUrl(story: Story): string {
	const args = isStarter(story) ? \`&args=label:\${STARTER_LABEL}\` : ""
	return \`/iframe.html?id=\${story.id}&viewMode=story\${args}\`
}

/**
 * The screenshots the browser workflow validates: every story, in both themes, on a desktop and a
 * phone. Motion is reduced, so nothing animates into the snapshot. Regenerate the baselines with
 * \`bun run test:visual:update\` after an intended visual change.
 */
test.describe("the built stories as screenshots", () => {
	for (const story of readStories()) {
		for (const theme of THEMES) {
			test.describe(\`\${story.name} in the \${theme} theme\`, () => {
				test.use({ colorScheme: theme })

				for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
					test(\`\${story.name} on \${viewportName}\`, async ({ page }) => {
						await pinFonts(page)
						await page.setViewportSize(viewport)
						await page.goto(storyUrl(story))
						await page.waitForFunction(
							() => (document.querySelector("#storybook-root")?.children.length ?? 0) > 0,
						)
						await page.addStyleTag({ content: FONT_CSS + THEME_CSS[theme] })
						await page.evaluate(async () => {
							await document.fonts.ready
						})
						await expect(page).toHaveScreenshot(\`\${slug(story)}-\${theme}-\${viewportName}.png\`)
					})
				}
			})
		}
	}
})
`
