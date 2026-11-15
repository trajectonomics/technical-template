import { starterStoryTitle, visualPageConstants } from "./visual-page"

/** The generated screenshot test: every story, both themes, desktop and mobile. */
export function visualStoryTest(name: string): Record<string, string> {
	const title = starterStoryTitle(name)
	return {
		"apps/storybook/e2e/visual.e2e.ts": `${IMPORTS}${visualPageConstants(title)}${storyHelpers()}
/**
 * The screenshots the browser workflow validates: every story, in both themes, on a desktop and a
 * phone. Motion is reduced, so nothing animates into the snapshot. Regenerate the baselines with
 * \`bun run test:visual:update\` after an intended visual change.
 */
test.describe("the built stories as screenshots", () => {
	for (const story of readStories()) {
		for (const theme of THEMES) {
			test.describe(\`\${story.title} \${story.name} in the \${theme} theme\`, () => {
				test.use({ colorScheme: theme })

				for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
					test(\`the \${viewportName} viewport\`, async ({ page }) => {
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
`,
	}
}

const IMPORTS = `import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"

`

function storyHelpers(): string {
	return `
/** One story the built Storybook exports. */
interface Story {
	readonly id: string
	readonly title: string
	readonly name: string
}

/** The stories in storybook-static/index.json; docs entries are not screenshotted. */
function readStories(): readonly Story[] {
	const raw = readFileSync("storybook-static/index.json", "utf8")
	const index = JSON.parse(raw) as { entries?: Record<string, Story & { type?: string }> }
	return Object.values(index.entries ?? {}).filter((entry) => entry.type === "story")
}

/** True only for the generated starter story, never for one the user adds. */
function isStarter(story: Story): boolean {
	return story.title === STARTER_TITLE && story.name === STARTER_STORY
}

/** The baseline slug: the starter's canonical name, because its story id carries the first term. */
function slug(story: Story): string {
	return (isStarter(story) ? "starter" : story.id).toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** Serve the committed fonts from e2e/fonts, so every runner renders the snapshots alike. */
async function pinFonts(page: Page): Promise<void> {
	const fonts = fileURLToPath(new URL("./fonts", import.meta.url))
	await page.route(\`**\${FONT_ROUTE}/*\`, (route) => {
		const name = route.request().url().split("/").pop() ?? ""
		return route.fulfill({ path: \`\${fonts}/\${name}\`, contentType: "font/ttf" })
	})
}

/** The story URL; the fixed label is passed only to the starter story. */
function storyUrl(story: Story): string {
	const args = isStarter(story) ? \`&args=label:\${STARTER_LABEL}\` : ""
	return \`/iframe.html?id=\${story.id}&viewMode=story\${args}\`
}
`
}
