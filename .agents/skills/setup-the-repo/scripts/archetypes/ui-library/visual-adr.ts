
/** The generated ADR that records the visual regression harness and amends ADR 0002. */
export function visualAdr(): Record<string, string> {
	return {
		"docs/adr/0003-visual-regression.md": `# ADR 0003: Visual Regression Testing

## Status

Accepted

## Context

The component library ships Svelte components whose appearance is their product. \`bun run check\`
type-checks, lints, unit-tests and builds them, but none of those fails when a layout, colour or
spacing change is unintended: \`trajectonomics/site\` PR #22 showed that only a screenshot comparison
catches it. A browser is needed for that, and the shared \`check\` job has none.

## Decision

- **Harness.** Plain Playwright (\`@playwright/test\`, pinned to \`1.65.0\`) screenshots the built
  Storybook (\`apps/storybook/storybook-static\`). No Playwright component testing, no Chromatic and
  no storybook test-runner: the proven \`trajectonomics/site\` pattern, with no SaaS token and no
  experimental package.
- **Baselines.** They are committed under \`apps/storybook/e2e/visual-snapshots/\`, flat
  (\`snapshotPathTemplate: "{snapshotDir}/{arg}{ext}"\`, no platform suffix: the Linux CI renderer is
  canonical). \`bun run test:visual:update\` regenerates them, so an intended visual change shows up
  as a pixel diff in the pull request and is deliberate.
- **Determinism.** The fonts are committed under \`apps/storybook/e2e/fonts/\` (Liberation Sans,
  SIL OFL 1.1) and served by the test, so a runner's installed fonts never change a pixel. Chromium
  is pinned by the Playwright version, animations are disabled, motion is reduced, the viewports are
  fixed at 1280x800 and 390x844, and \`maxDiffPixelRatio\` absorbs sub-pixel noise.
- **Variants.** Every story the built Storybook exports, times light and dark, times desktop and
  mobile. No per-language matrix until a component takes copy props.
- **Server.** A tiny Bun static server (\`apps/storybook/scripts/serve-static.ts\`) serves the build to
  Playwright's \`webServer\`, so the harness adds no dependency beyond Playwright.
- **Where it runs.** \`.github/workflows/browser.yml\`, on pull requests to \`main\` only, beside the
  shared check. It is archetype-local, like \`trajectonomics/site\`'s browser workflow, and the shared
  \`trajectonomics/cicd\` workflows stay browser-free.
- **\`bun run check\`.** The visual tests are never part of it. ADR 0002 records two test runners
  (\`bun test\` and Vitest); there are three now, and Playwright is the browser-only one.

## Consequences

- A component that changes appearance without an intended baseline update fails its pull request.
- A runner image that changes its fonts changes nothing: the fonts are committed and pinned.
- The baselines are Linux-generated; regenerate them where the browser workflow runs, or with the
  same Playwright version, when they have to change.
- \`bun install\` gains the Playwright package, and installing Chromium locally is one extra command
  (\`bun x --cwd apps/storybook playwright install chromium\`).
`,
	}
}
