import { VISUAL_FONTS } from "./visual-assets"

/** The title the generated starter story carries; Storybook derives its story id from it. */
export function starterStoryTitle(name: string): string {
	return `Components/${name}`
}

const FONT_FACES = VISUAL_FONTS.map(
	(font) =>
		`@font-face { font-family: "Visual Sans"; src: url("/e2e-fonts/${font.file}"); font-weight: ${font.weight}; }`,
).join("\n")

/**
 * The generated constants that decide what a screenshotted page is: the viewports, the themes, the
 * pinned fonts and the colours, plus the starter story the canonical baseline belongs to.
 */
export function visualPageConstants(starterTitle: string): string {
	return `/** The viewports the screenshots cover: the desktop the checks run at, and a phone. */
const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const

/** The themes the screenshots cover, as the colour scheme Playwright sets. */
const THEMES = ["light", "dark"] as const

/** The URL path the committed fonts are served from. */
const FONT_ROUTE = "/e2e-fonts"

/** The generated starter story. Its baseline is canonical, so it never carries the first term. */
const STARTER_TITLE = "${starterTitle}"
const STARTER_STORY = "Default"
const STARTER_LABEL = "Starter"

/** The page colours per theme: the starter component sets none of its own. */
const THEME_CSS = {
	light: "html, body { background: #ffffff; color: #111111; }",
	dark: "html, body { background: #111111; color: #f5f5f5; }",
} as const

/** The fonts every screenshot renders with, so the runner's own fonts are never used. */
const FONT_CSS = \`${FONT_FACES}
html, body { font-family: "Visual Sans", sans-serif; }
\`
`
}
