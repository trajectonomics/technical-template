import { parseArgs } from "node:util"
import {
	ARCHETYPES,
	type Archetype,
	type DomainTerm,
	type SetupAnswers,
	SetupError,
} from "./types"

/** Defaults inferred from git before the command line overrides them. */
export interface ArgDefaults {
	readonly repoName: string
	readonly packageName: string
	readonly description: string
}

/** Everything the command line decided. */
export interface ParsedSetup {
	readonly answers: SetupAnswers
	readonly force: boolean
	readonly noCommit: boolean
	/** True when no --name or --non-interactive forces a scripted run. */
	readonly interactive: boolean
}

function isArchetype(value: string): value is Archetype {
	return (ARCHETYPES as readonly string[]).includes(value)
}

/** Parses repeatable `--term "Name=Definition"` values. */
export function parseTerms(raw: readonly string[] | undefined): DomainTerm[] {
	const terms: DomainTerm[] = []
	for (const entry of raw ?? []) {
		const separator = entry.indexOf("=")
		if (separator < 0) {
			throw new SetupError(
				"MALFORMED_TERM",
				`--term must be "Name=Definition", got "${entry}".`,
				"term",
			)
		}
		const term = entry.slice(0, separator).trim()
		const definition = entry.slice(separator + 1).trim()
		if (term.length === 0) {
			throw new SetupError("INVALID_TERM", `--term needs a name, got "${entry}".`, "term")
		}
		if (definition.length === 0) {
			throw new SetupError(
				"EMPTY_DEFINITION",
				`Domain term "${term}" needs a definition.`,
				"term",
			)
		}
		terms.push({ term, definition })
	}
	return terms
}

function booleanFlag(value: string | undefined, name: string): boolean | undefined {
	if (value === undefined) return undefined
	if (value === "true" || value === "y") return true
	if (value === "false" || value === "n") return false
	throw new SetupError("INVALID_FLAG", `--${name} must be true or false, got "${value}".`, name)
}

/** Turns argv into answers, or a SetupError the caller prints without a stack. */
export function parseSetupArgs(argv: readonly string[], defaults: ArgDefaults): ParsedSetup {
	const { values } = parseArgs({
		args: [...argv],
		options: {
			name: { type: "string" },
			pkg: { type: "string" },
			description: { type: "string" },
			archetype: { type: "string" },
			publish: { type: "string" },
			storybook: { type: "string" },
			term: { type: "string", multiple: true },
			"co-author": { type: "string", multiple: true },
			force: { type: "boolean", default: false },
			"non-interactive": { type: "boolean", default: false },
			"no-commit": { type: "boolean", default: false },
		},
		strict: false,
	})

	const parsedValues = values as {
		name?: string
		pkg?: string
		description?: string
		archetype?: string
		publish?: string
		storybook?: string
		term?: string[]
		"co-author"?: string[]
		force?: boolean
		"non-interactive"?: boolean
		"no-commit"?: boolean
	}

	const rawArchetype = parsedValues.archetype ?? "core"
	if (!isArchetype(rawArchetype)) {
		throw new SetupError(
			"UNKNOWN_ARCHETYPE",
			`Unknown archetype "${rawArchetype}". Valid values: ${ARCHETYPES.join(", ")}.`,
			"archetype",
		)
	}
	const archetype: Archetype = rawArchetype

	const requestedPublish = booleanFlag(parsedValues.publish, "publish")
	if (archetype === "ui-library" && requestedPublish === true) {
		throw new SetupError(
			"PUBLISH_WORKSPACE_UNSUPPORTED",
			"The ui-library Archetype ships with publishing off: the shared publish workflow publishes one package from the repository root and cannot serve a Bun workspace. Use per-package release workflows until trajectonomics/cicd ships a multi-package pipeline (see design-system release-*.yml as the reference).",
			"publish",
		)
	}
	const enablePublish = requestedPublish ?? archetype === "core"

	const requestedStorybook = booleanFlag(parsedValues.storybook, "storybook")
	if (archetype !== "ui-library" && requestedStorybook !== undefined) {
		throw new SetupError(
			"INVALID_FLAG",
			"--storybook only applies to the ui-library archetype.",
			"storybook",
		)
	}
	const storybook = archetype === "ui-library" && requestedStorybook !== false

	const packageName = parsedValues.pkg ?? defaults.packageName
	const terms = parseTerms(parsedValues.term)
	const coAuthors = (parsedValues["co-author"] ?? [])
		.map((author) => author.trim())
		.filter(Boolean)

	return Object.freeze({
		answers: Object.freeze({
			repoName: parsedValues.name ?? defaults.repoName,
			packageName,
			description: parsedValues.description ?? defaults.description,
			archetype,
			storybook,
			domainTerms: Object.freeze(terms),
			enablePublish,
			coAuthors: Object.freeze(coAuthors),
		}),
		force: parsedValues.force ?? false,
		noCommit: parsedValues["no-commit"] ?? false,
		interactive: !(parsedValues["non-interactive"] ?? false) && parsedValues.name === undefined,
	})
}
