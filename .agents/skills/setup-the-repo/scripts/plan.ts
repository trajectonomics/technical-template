import { ARCHETYPE_PLANNERS } from "./archetypes"
import { deriveStarterName, isPlaceholder } from "./terms"
import type { Plan, SetupAnswers, Snapshot } from "./types"

/** The PascalCase starter name the first glossary term gives, or its placeholder. */
export function starterName(answers: SetupAnswers): string {
	return deriveStarterName(answers.domainTerms[0]?.term ?? "")
}

/**
 * Builds the complete write/delete plan from answers and a read-only snapshot.
 * Pure: no I/O, no clock, no randomness.
 */
export function buildPlan(answers: SetupAnswers, snapshot: Snapshot): Plan {
	const name = starterName(answers)
	return ARCHETYPE_PLANNERS[answers.archetype]({
		answers,
		snapshot,
		name,
		placeholder: isPlaceholder(name),
	})
}
