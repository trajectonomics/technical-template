#!/usr/bin/env bun
/**
 * End-to-end verification of the bootstrapper. For each Archetype it copies the
 * template into a throwaway directory (outside any git repository), initializes
 * git, runs setup non-interactively, then proves a frozen install and a clean
 * `bun run check` on the result.
 *
 * It needs network and minutes, so it is not part of `bun run check` or CI.
 * Run it before merging any change to setup and put the result in the pull request.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { basename, join } from "node:path"
import { homedir } from "node:os"

interface Scenario {
	readonly name: string
	readonly archetype: string
	readonly args: readonly string[]
}

const SCENARIOS: readonly Scenario[] = [
	{ name: "core", archetype: "core", args: ["--archetype", "core", "--publish", "false"] },
	{ name: "cli", archetype: "cli", args: ["--archetype", "cli"] },
	{ name: "service", archetype: "service", args: ["--archetype", "service"] },
	{ name: "minimal", archetype: "minimal", args: ["--archetype", "minimal"] },
	{ name: "ui-library", archetype: "ui-library", args: ["--archetype", "ui-library"] },
	{
		name: "ui-library-no-storybook",
		archetype: "ui-library",
		args: ["--archetype", "ui-library", "--storybook", "false"],
	},
]

const SKIP = new Set(["node_modules", ".git", "dist", "coverage", "storybook-static", ".scratch"])
const LONG = 15 * 60 * 1000

function run(cmd: readonly string[], cwd: string, timeoutMs = LONG): string {
	const result = Bun.spawnSync({
		cmd: [...cmd],
		cwd,
		timeout: timeoutMs,
		stdout: "pipe",
		stderr: "pipe",
	})
	const output = `${result.stdout.toString()}${result.stderr.toString()}`.trim()
	if (result.exitCode !== 0) {
		throw new Error(`Command failed (exit ${result.exitCode}): ${cmd.join(" ")}\n${output}`)
	}
	return output
}

function templateRoot(): string {
	const out = run(["git", "rev-parse", "--show-toplevel"], process.cwd())
	return out
}

function branchOf(cwd: string): string {
	return run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd)
}

function scaffold(scenario: Scenario, source: string, base: string): string {
	const dir = join(base, scenario.name)
	cpSync(source, dir, {
		recursive: true,
		filter: (path) => !SKIP.has(basename(path)),
	})
	run(["git", "init", "-q", "-b", "main"], dir)
	run(["git", "config", "user.email", "verify-setup@trajectonomics.invalid"], dir)
	run(["git", "config", "user.name", "verify-setup"], dir)
	run(["git", "add", "-A"], dir)
	run(["git", "commit", "-qm", "template"], dir)

	const slug = scenario.name
	const setupArgs = [
		"bun",
		".agents/skills/setup-the-repo/scripts/setup.ts",
		"--non-interactive",
		"--name",
		`trajectonomics/verify-${slug}`,
		"--pkg",
		`@trajectonomics/verify-${slug}`,
		"--description",
		"Verification scaffold",
		"--term",
		"Invoice=A bill sent to a customer.",
		"--term",
		"Tax Rate=A percentage of the amount.",
		...scenario.args,
	]
	run(setupArgs, dir, LONG)

	if (branchOf(dir) !== "feat/bootstrap") {
		throw new Error(`Expected branch feat/bootstrap, got ${branchOf(dir)}`)
	}
	if (existsSync(join(dir, ".agents/skills/setup-the-repo"))) {
		throw new Error("setup did not remove .agents/skills/setup-the-repo")
	}
	run(["bun", "install", "--frozen-lockfile"], dir, LONG)
	run(["bun", "run", "check"], dir, LONG)
	return dir
}

function main(): void {
	const keep = Bun.argv.includes("--keep")
	const source = templateRoot()
	const cache = join(homedir(), ".cache")
	mkdirSync(cache, { recursive: true })
	const base = mkdtempSync(join(cache, "verify-setup-"))
	let failures = 0

	console.log(`verify:setup in ${base}\n`)
	try {
		for (const scenario of SCENARIOS) {
			const started = Date.now()
			try {
				scaffold(scenario, source, base)
				const seconds = ((Date.now() - started) / 1000).toFixed(1)
				console.log(`✓ ${scenario.name} (${seconds}s)`)
			} catch (error) {
				failures += 1
				console.error(`✗ ${scenario.name}:\n${(error as Error).message}\n`)
			}
		}
	} finally {
		if (keep) console.log(`kept ${base}`)
		else rmSync(base, { recursive: true, force: true })
	}

	if (failures > 0) {
		console.error(`${failures} of ${SCENARIOS.length} scenarios failed`)
		process.exit(1)
	}
	console.log(`all ${SCENARIOS.length} scenarios passed`)
}

main()
