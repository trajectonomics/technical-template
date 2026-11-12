import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Snapshot } from "./types"

/** The template files the planner reads; every other input is a constant. */
export const SNAPSHOT_PATHS = ["package.json", "AGENTS.md", "tsconfig.json", ".gitignore"] as const

/** Reads a frozen, read-only view of the files the planner may consult. */
export function readSnapshot(rootDir: string): Snapshot {
	const files: Record<string, string> = {}
	for (const path of SNAPSHOT_PATHS) {
		const full = join(rootDir, path)
		if (existsSync(full)) files[path] = readFileSync(full, "utf8")
	}
	return Object.freeze({ files: Object.freeze(files) })
}
