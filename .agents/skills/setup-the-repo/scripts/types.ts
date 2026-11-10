/** Values understood by setup, in the order the questionnaire lists them. */
export const ARCHETYPES = ["core", "cli", "service", "minimal", "ui-library"] as const

/** A project shape the bootstrapper can scaffold. */
export type Archetype = (typeof ARCHETYPES)[number]

/** One glossary term and its binding definition. */
export interface DomainTerm {
	readonly term: string
	readonly definition: string
}

/** Everything the questionnaire or the command line decided. */
export interface SetupAnswers {
	readonly repoName: string
	readonly packageName: string
	readonly description: string
	readonly archetype: Archetype
	readonly storybook: boolean
	readonly domainTerms: readonly DomainTerm[]
	readonly enablePublish: boolean
	readonly coAuthors: readonly string[]
}

/** The read-only view of the repository the planner is allowed to use. */
export interface Snapshot {
	readonly files: Readonly<Record<string, string>>
}

/** A complete description of the files setup will change. */
export interface Plan {
	readonly writes: Readonly<Record<string, string>>
	readonly deletes: readonly string[]
}

/** The parts of package.json setup understands; the rest is preserved. */
export interface PackageJson {
	name?: string
	description?: string
	private?: boolean
	repository?: { type: string; url: string; directory?: string }
	scripts?: Record<string, string>
	bin?: Record<string, string>
	main?: string
	module?: string
	types?: string
	svelte?: string
	exports?: unknown
	files?: string[]
	publishConfig?: unknown
	workspaces?: string[]
	dependencies?: Record<string, string>
	peerDependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	[key: string]: unknown
}

/** Input shared by every Archetype planner. */
export interface PlanInput {
	readonly answers: SetupAnswers
	readonly snapshot: Snapshot
	/** PascalCase name derived from the first glossary term. */
	readonly name: string
	/** True when `name` is the marked placeholder rather than the user's term. */
	readonly placeholder: boolean
}

/** Every rejection setup can report, one code per rule. */
export type SetupErrorCode =
	| "UNKNOWN_ARCHETYPE"
	| "INVALID_FLAG"
	| "PUBLISH_WORKSPACE_UNSUPPORTED"
	| "INVALID_TERM"
	| "EMPTY_DEFINITION"
	| "GIT_UNAVAILABLE"
	| "BOOTSTRAP_BRANCH_EXISTS"
	| "FORMAT_FAILED"
	| "CHECK_FAILED"
	| "COMMIT_FAILED"

/** A plan error the user can fix, never a stack trace. */
export class SetupError extends Error {
	readonly code: SetupErrorCode
	/** The caller's input path the rule rejected, when one exists. */
	readonly field: string | null

	constructor(code: SetupErrorCode, message: string, field: string | null = null) {
		super(message)
		this.name = "SetupError"
		this.code = code
		this.field = field
	}
}
