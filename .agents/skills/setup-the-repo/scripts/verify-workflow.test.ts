import { describe, expect, it } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { SETUP_VERIFY_WORKFLOW } from "./archetypes/shared"
import { buildPlan } from "./plan"
import { templateSnapshot, testAnswers } from "./testing"
import { ARCHETYPES } from "./types"

/** A step that either runs a command or calls an action, never both. */
interface Step {
	readonly run?: string
	readonly uses?: string
}

interface Job {
	readonly uses?: string
	readonly steps?: readonly Step[]
	readonly "timeout-minutes"?: number
}

interface Trigger {
	readonly branches?: readonly string[]
	readonly paths?: readonly string[]
}

interface Workflow {
	readonly on?: Record<string, Trigger | null>
	readonly permissions?: Record<string, string>
	readonly jobs?: Record<string, Job>
}

/** The entries a filtered run must never lose: the skill, the workflow, the pin, and `.vibe/skills`. */
const REQUIRED_PATHS = [
	".agents/skills/setup-the-repo/**",
	SETUP_VERIFY_WORKFLOW,
	"package.json",
	"bun.lock",
	".vibe/skills/**",
]

function workflow(): Workflow {
	const path = join(process.cwd(), SETUP_VERIFY_WORKFLOW)
	return Bun.YAML.parse(readFileSync(path, "utf8")) as Workflow
}

function soleJob(): Job {
	const jobs = Object.values(workflow().jobs ?? {})
	expect(jobs).toHaveLength(1)
	return jobs[0]!
}

describe("the verify-setup workflow", () => {
	it("exists in the template, where the script it runs exists", () => {
		expect(existsSync(join(process.cwd(), SETUP_VERIFY_WORKFLOW))).toBe(true)
	})

	it("runs its own steps instead of calling a shared workflow", () => {
		const job = soleJob()
		expect(job.uses).toBeUndefined()
		expect(job.steps?.length).toBeGreaterThan(0)
	})

	it("runs on a pull request and on a main push, both filtered to the same files a scaffold keeps", () => {
		const on = workflow().on ?? {}
		const request = on["pull_request"]
		const push = on["push"]
		expect(request?.branches).toEqual(["main"])
		expect(push?.branches).toEqual(["main"])
		expect(request?.paths).toEqual(push?.paths)
		for (const path of REQUIRED_PATHS) {
			expect(request?.paths).toContain(path)
		}
		expect(on).toHaveProperty("workflow_dispatch")
	})

	it("runs bun run verify:setup, read-only, within 30 minutes", () => {
		const job = soleJob()
		expect(workflow().permissions).toEqual({ contents: "read" })
		expect(job["timeout-minutes"]).toBe(30)
		expect(job.steps?.map((step) => step.run)).toContain("bun run verify:setup")
	})
})

describe("a scaffold never carries the verify-setup workflow", () => {
	const snapshot = templateSnapshot()

	for (const storybook of [true, false]) {
		it.each(ARCHETYPES)(
			`deletes it for %s with storybook ${String(storybook)}`,
			(archetype) => {
				const plan = buildPlan(
					testAnswers({ archetype, enablePublish: false, storybook }),
					snapshot,
				)
				expect(plan.deletes).toContain(SETUP_VERIFY_WORKFLOW)
			},
		)
	}
})
