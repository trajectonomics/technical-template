/** The archetype's committed binary assets: the pinned fonts and the starter story's baselines. */
const ASSET_ROOT = ".agents/skills/setup-the-repo/scripts/archetypes/ui-library/assets"

/** The font files every generated Storybook app renders its screenshots with. */
export const VISUAL_FONTS = ["LiberationSans-Regular.ttf", "LiberationSans-Bold.ttf"] as const

/** The SIL OFL 1.1 licence the pinned fonts ship under. */
export const VISUAL_FONT_LICENCE = "OFL.txt"

/** Where the pinned fonts land in a generated Storybook app. */
export const VISUAL_FONT_DIR = "apps/storybook/e2e/fonts"

/** Where the committed baselines land in a generated Storybook app. */
export const VISUAL_SNAPSHOT_DIR = "apps/storybook/e2e/visual-snapshots"

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
	for (const font of [...VISUAL_FONTS, VISUAL_FONT_LICENCE]) {
		copies[`${VISUAL_FONT_DIR}/${font}`] = `${ASSET_ROOT}/fonts/${font}`
	}
	for (const baseline of STARTER_BASELINES) {
		copies[`${VISUAL_SNAPSHOT_DIR}/${baseline}`] = `${ASSET_ROOT}/baselines/${baseline}`
	}
	return copies
}
