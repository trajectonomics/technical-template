import type { Archetype, Plan, PlanInput } from "../types"
import { planCli } from "./cli"
import { planCore } from "./core"
import { planMinimal } from "./minimal"
import { planService } from "./service"
import { planUiLibrary } from "./ui-library"

/** One planner per Archetype; adding the next Archetype is one entry and one file. */
export const ARCHETYPE_PLANNERS: Readonly<Record<Archetype, (input: PlanInput) => Plan>> = {
	core: planCore,
	cli: planCli,
	service: planService,
	minimal: planMinimal,
	"ui-library": planUiLibrary,
}
