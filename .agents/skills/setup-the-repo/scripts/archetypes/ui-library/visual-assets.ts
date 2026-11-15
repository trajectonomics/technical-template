/** The archetype's committed binary assets: the pinned fonts and the starter story's baselines. */
const ASSET_ROOT = ".agents/skills/setup-the-repo/scripts/archetypes/ui-library/assets"

/** Where the pinned fonts live inside the Storybook app. */
export const VISUAL_FONT_APP_DIR = "e2e/fonts"

/** Where the committed baselines live inside the Storybook app. */
export const VISUAL_SNAPSHOT_APP_DIR = "e2e/visual-snapshots"

/** The font files every screenshot renders with, and the weight each one is declared at. */
export const VISUAL_FONTS = [
	{ file: "LiberationSans-Regular.ttf", weight: 400 },
	{ file: "LiberationSans-Bold.ttf", weight: 700 },
] as const

/** The SIL OFL 1.1 licence the pinned fonts ship under. */
export const VISUAL_FONT_LICENCE = "OFL.txt"

/** The theme and viewport pairs `e2e/visual.e2e.ts` screenshots, in this order. */
export const VISUAL_VARIANTS = [
	"light-desktop",
	"light-mobile",
	"dark-desktop",
	"dark-mobile",
] as const

/** The starter story's committed baselines: one file per theme and viewport. */
export const STARTER_BASELINES = VISUAL_VARIANTS.map((variant) => `starter-${variant}.png`)

/** The `copies` entries that land the fonts and the starter baselines in the generated app. */
export function visualCopies(): Readonly<Record<string, string>> {
	const copies: Record<string, string> = {}
	const fonts = [...VISUAL_FONTS.map((font) => font.file), VISUAL_FONT_LICENCE]
	for (const font of fonts) {
		copies[`apps/storybook/${VISUAL_FONT_APP_DIR}/${font}`] = `${ASSET_ROOT}/fonts/${font}`
	}
	for (const baseline of STARTER_BASELINES) {
		const path = `apps/storybook/${VISUAL_SNAPSHOT_APP_DIR}/${baseline}`
		copies[path] = `${ASSET_ROOT}/baselines/${baseline}`
	}
	return copies
}
