import { ARCHETYPE_PLANNERS } from "./archetypes"
import { deriveStarterName, isPlaceholder } from "./terms"
import type { Plan, SetupAnswers, Snapshot } from "./types"

/** The PascalCase starter name the first glossary term gives, or its placeholder. */
export function starterName(answers: SetupAnswers): string {
	return deriveStarterName(answers.domainTerms[0]?.term ?? "")
}

/** The complete write/delete plan; pure and deterministic. */
export function buildPlan(answers: SetupAnswers, snapshot: Snapshot): Plan {
	const name = starterName(answers)
	const plan = ARCHETYPE_PLANNERS[answers.archetype]({
		answers,
		snapshot,
		name,
		placeholder: isPlaceholder(name),
	})
	return Object.freeze({
		writes: Object.freeze({ ...plan.writes }),
		deletes: Object.freeze([...plan.deletes]),
	})
}
