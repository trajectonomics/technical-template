import { readSnapshot } from "./snapshot"
import type { SetupAnswers, Snapshot } from "./types"

/** The real template files, read from the repository root. */
export function templateSnapshot(): Snapshot {
	return readSnapshot(process.cwd())
}

/** Answers for a happy-path planning test. */
export function testAnswers(overrides: Partial<SetupAnswers> = {}): SetupAnswers {
	return {
		repoName: "trajectonomics/example",
		packageName: "@trajectonomics/example",
		description: "Example package",
		archetype: "core",
		storybook: true,
		domainTerms: [{ term: "Invoice", definition: "A bill sent to a customer." }],
		enablePublish: true,
		coAuthors: [],
		...overrides,
	}
}
