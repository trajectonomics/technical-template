import { describe, expect, it } from "bun:test"
import { BOOTSTRAP_BRANCH, decideBranch } from "./branch"

describe("decideBranch", () => {
	it("switches off main onto feat/bootstrap", () => {
		expect(decideBranch("main", [])).toEqual({
			switchTo: BOOTSTRAP_BRANCH,
			skipCommit: false,
			error: null,
			errorCode: null,
		})
	})

	it("switches off master onto feat/bootstrap", () => {
		expect(decideBranch("master", []).switchTo).toBe(BOOTSTRAP_BRANCH)
	})

	it("refuses to start when feat/bootstrap is already taken", () => {
		const decision = decideBranch("main", ["main", BOOTSTRAP_BRANCH])
		expect(decision.error).toContain(BOOTSTRAP_BRANCH)
		expect(decision.errorCode).toBe("BOOTSTRAP_BRANCH_EXISTS")
		expect(decision.switchTo).toBeNull()
	})

	it("leaves a feature branch alone", () => {
		expect(decideBranch("feat/thing", [])).toEqual({
			switchTo: null,
			skipCommit: false,
			error: null,
			errorCode: null,
		})
	})

	it("scaffolds on a detached HEAD but leaves the commit to the caller", () => {
		expect(decideBranch(null, [])).toEqual({
			switchTo: null,
			skipCommit: true,
			error: null,
			errorCode: null,
		})
	})
})
