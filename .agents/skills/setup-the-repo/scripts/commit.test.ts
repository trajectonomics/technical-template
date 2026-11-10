import { describe, expect, it } from "bun:test"
import { COMMIT_SUBJECT, commitMessage } from "./commit"

describe("commitMessage", () => {
	it("is just the subject without co-authors", () => {
		expect(commitMessage([])).toBe(COMMIT_SUBJECT)
	})

	it("adds one trailer per co-author", () => {
		expect(commitMessage(["Ada Lovelace <ada@example.com>"])).toBe(
			`${COMMIT_SUBJECT}\n\nCo-Authored-By: Ada Lovelace <ada@example.com>`,
		)
	})

	it("adds several trailers in order and ignores blank entries", () => {
		expect(
			commitMessage(["Ada Lovelace <ada@example.com>", "  ", "Bun <bun@example.com>"]),
		).toBe(
			`${COMMIT_SUBJECT}\n\nCo-Authored-By: Ada Lovelace <ada@example.com>\nCo-Authored-By: Bun <bun@example.com>`,
		)
	})
})
