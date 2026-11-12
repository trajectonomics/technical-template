import { readSnapshot } from "./snapshot"
import { SetupError } from "./types"
import type { SetupAnswers, Snapshot } from "./types"

/** The real template files, read from the repository root. */
export function templateSnapshot(): Snapshot {
	return readSnapshot(process.cwd())
}

/** The SetupError a call throws, so a test can assert its code. */
export function errorOf(run: () => unknown): SetupError | undefined {
	try {
		run()
		return undefined
	} catch (error) {
		return error instanceof SetupError ? error : undefined
	}
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
