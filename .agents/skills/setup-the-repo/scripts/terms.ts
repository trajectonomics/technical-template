import type { SetupAnswers } from "./types"

/** The neutral, marked fallback when a term cannot become an identifier. */
export const PLACEHOLDER_NAME = "Example"

/**
 * Names the generated starter already uses, plus the TypeScript and Bun globals
 * a starter could collide with. A term that derives one of these falls back.
 */
const RESERVED = new Set([
	"DomainError",
	"DomainErrorCode",
	"Error",
	"Object",
	"String",
	"Number",
	"Boolean",
	"Array",
	"Function",
	"Symbol",
	"Promise",
	"Map",
	"Set",
	"Date",
	"JSON",
	"Math",
	"BigInt",
	"RegExp",
	"Response",
	"Request",
	"Bun",
	"process",
	"undefined",
	"null",
	"void",
	"this",
	"new",
	"class",
	"interface",
	"type",
	"enum",
	"const",
	"let",
	"var",
	"function",
	"return",
	"import",
	"export",
	"default",
	"extends",
	"implements",
])

/**
 * Turns a glossary term into a PascalCase TypeScript identifier. Only ASCII
 * letters and digits survive; a result that is empty, starts with a digit, or
 * collides with a reserved or global name becomes the marked placeholder.
 */
export function deriveStarterName(term: string): string {
	const words = term.match(/[A-Za-z0-9]+/g) ?? []
	const pascal = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
	if (pascal.length === 0 || /^[0-9]/.test(pascal) || RESERVED.has(pascal)) return PLACEHOLDER_NAME
	return pascal
}

/** True when the derived name is the marked placeholder rather than the term. */
export function isPlaceholder(name: string): boolean {
	return name === PLACEHOLDER_NAME
}

/** The kebab-case file and folder name used by the Svelte package. */
export function toKebabCase(name: string): string {
	return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

/** The GLOSSARY.md the generated repository keeps. */
export function glossaryContent(answers: SetupAnswers): string {
	const terms = answers.domainTerms
		.map(({ term, definition }) => `### ${term}\n${definition}\n\n`)
		.join("")
	return `# Domain Glossary: ${answers.packageName}

Ubiquitous language for \`${answers.repoName}\`. Every term defined here is binding across code, tests, documentation, and PR titles. Synonyms in a diff are defects.

## Core Terms

${terms}### Invariant
A rule or condition that must hold true across all state transitions in this system.
`
}
