/**
 * The archetype-local browser workflow: the screenshots need a browser, so they run here and not in
 * the shared check. PR-only, like `trajectonomics/site`'s, and never a shared `cicd` workflow.
 */
export function visualWorkflow(): Record<string, string> {
	return { ".github/workflows/browser.yml": VISUAL_WORKFLOW }
}

const VISUAL_WORKFLOW = `name: Browser checks

# The Storybook screenshots need a browser, so they run here and not in the shared check:
# \`bun run check\` stays browser-free and fast (ADR 0003), and this workflow stays archetype-local
# rather than becoming a shared trajectonomics/cicd workflow.
#
# Pull requests only: the screenshots gate the PR, and the run after the merge to main would only
# repeat what the PR already proved.
on:
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  visual:
    name: Visual regression
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      # No bun-version: the action reads packageManager from package.json, where the pin lives.
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      # The Chromium build is pinned by the Playwright version, so the cache key carries it.
      - name: Read the Playwright version
        id: playwright
        run: echo "version=\$(bun -e 'console.log((await Bun.file("apps/storybook/package.json").json()).devDependencies["@playwright/test"])')" >> "\$GITHUB_OUTPUT"

      - name: Cache the Playwright browser
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-\${{ runner.os }}-\${{ steps.playwright.outputs.version }}

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Chromium
        run: bun x --cwd apps/storybook playwright install --with-deps chromium

      - name: Run the visual checks
        run: bun run test:visual

      - name: Upload the Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/storybook/playwright-report/
          retention-days: 7
`
