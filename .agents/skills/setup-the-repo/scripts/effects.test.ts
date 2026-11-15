import { describe, expect, it } from "bun:test"
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { applyPlan, removeSetupSkill } from "./effects"
import { buildPlan } from "./plan"
import { templateSnapshot, testAnswers } from "./testing"
import { ARCHETYPES } from "./types"

describe("binary asset copies in a plan", () => {
	it.each(ARCHETYPES)("defaults to an empty copies map for %s", (archetype) => {
		const plan = buildPlan(testAnswers({ archetype, storybook: false }), templateSnapshot())
		expect(plan.copies).toEqual({})
	})
})

describe("removing the bootstrap skill", () => {
	it("removes the skill and both of its symlinks", () => {
		const rootDir = mkdtempSync(join(tmpdir(), "remove-skill-"))
		try {
			for (const path of [".agents/skills/setup-the-repo", ".claude/skills", ".vibe/skills"]) {
				mkdirSync(join(rootDir, path), { recursive: true })
			}
			const link = "../../.agents/skills/setup-the-repo"
			symlinkSync(link, join(rootDir, ".claude/skills/setup-the-repo"))
			symlinkSync(link, join(rootDir, ".vibe/skills/setup-the-repo"))

			removeSetupSkill(rootDir)

			expect(existsSync(join(rootDir, ".agents/skills/setup-the-repo"))).toBe(false)
			expect(readdirSync(join(rootDir, ".claude/skills"))).toEqual([])
			expect(readdirSync(join(rootDir, ".vibe/skills"))).toEqual([])
		} finally {
			rmSync(rootDir, { recursive: true, force: true })
		}
	})
})

describe("applying a setup plan", () => {
	it("copies a planned asset byte-identically", () => {
		const rootDir = mkdtempSync(join(tmpdir(), "apply-plan-"))
		try {
			mkdirSync(join(rootDir, "assets"), { recursive: true })
			const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff])
			writeFileSync(join(rootDir, "assets/starter.png"), bytes)

			applyPlan(rootDir, {
				writes: { "README.md": "readme" },
				copies: { "apps/storybook/e2e/visual-snapshots/starter.png": "assets/starter.png" },
				deletes: [],
			})

			const copied = readFileSync(
				join(rootDir, "apps/storybook/e2e/visual-snapshots/starter.png"),
			)
			expect(copied).toEqual(Buffer.from(bytes))
		} finally {
			rmSync(rootDir, { recursive: true, force: true })
		}
	})

	it("copies before it deletes", () => {
		const rootDir = mkdtempSync(join(tmpdir(), "apply-plan-order-"))
		try {
			writeFileSync(join(rootDir, "font.ttf"), "font")
			writeFileSync(join(rootDir, "remove-me.txt"), "gone")

			applyPlan(rootDir, {
				writes: {},
				copies: { "apps/storybook/e2e/fonts/font.ttf": "font.ttf" },
				deletes: ["remove-me.txt", "font.ttf"],
			})

			expect(readFileSync(join(rootDir, "apps/storybook/e2e/fonts/font.ttf"), "utf8")).toBe(
				"font",
			)
			expect(existsSync(join(rootDir, "remove-me.txt"))).toBe(false)
		} finally {
			rmSync(rootDir, { recursive: true, force: true })
		}
	})
})
