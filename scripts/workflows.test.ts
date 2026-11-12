import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

type Job = { uses?: string; steps?: unknown[] }
type Workflow = {
	on?: Record<string, unknown>
	permissions?: Record<string, string>
	concurrency?: unknown
	jobs?: Record<string, Job>
}

const WORKFLOWS = join(import.meta.dir, "..", ".github", "workflows")

function load(file: string): Workflow {
	return Bun.YAML.parse(readFileSync(join(WORKFLOWS, file), "utf8")) as Workflow
}

/** A caller is one job; a second job means this is no longer the shape a new repository copies. */
function soleJob(workflow: Workflow): Job {
	const jobs = Object.values(workflow.jobs ?? {})
	expect(jobs).toHaveLength(1)
	return jobs[0]!
}

const callers = [
	{ file: "ci.yml", uses: "trajectonomics/cicd/.github/workflows/check.yml@v1" },
	{ file: "pr-title.yml", uses: "trajectonomics/cicd/.github/workflows/pr-title.yml@v1" },
	{ file: "drift.yml", uses: "trajectonomics/cicd/.github/workflows/drift.yml@v1" },
]

describe("the three callers a new repository copies", () => {
	for (const caller of callers) {
		it(`${caller.file} calls the shared workflow at v1 and has no steps`, () => {
			const job = soleJob(load(caller.file))
			expect(job.uses).toBe(caller.uses)
			expect(job.steps).toBeUndefined()
		})
	}

	it("ci.yml and pr-title.yml add no permissions or concurrency of their own", () => {
		for (const file of ["ci.yml", "pr-title.yml"]) {
			const workflow = load(file)
			expect(workflow.permissions).toBeUndefined()
			expect(workflow.concurrency).toBeUndefined()
		}
	})
})

describe("drift.yml, the third caller", () => {
	it("runs weekly and by hand, because the caller owns the schedule", () => {
		const workflow = load("drift.yml")
		expect(workflow.on?.["schedule"]).toEqual([{ cron: "0 6 * * 1" }])
		expect(workflow.on).toHaveProperty("workflow_dispatch")
	})

	it("grants contents to check the repository out and issues to report drift", () => {
		expect(load("drift.yml").permissions).toEqual({ contents: "read", issues: "write" })
	})
})
