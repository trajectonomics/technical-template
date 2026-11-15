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
import { removeSetupSkill } from "./effects"

describe("removeSetupSkill", () => {
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
