import { coreStarter } from "../../starters"
import type { PackageJson, PlanInput } from "../../types"
import { json } from "../shared"

export function corePackage(input: PlanInput): Record<string, string> {
	const answers = input.answers
	const starter = coreStarter(answers.packageName, input.name, input.placeholder)
	const pkg: PackageJson = {
		name: answers.packageName,
		version: "0.0.0-development",
		description: answers.description,
		license: "MIT",
		repository: {
			type: "git",
			url: `git+https://github.com/${answers.repoName}.git`,
			directory: "packages/core",
		},
		type: "module",
		sideEffects: false,
		engines: { node: ">=20.0.0" },
		main: "./dist/index.cjs",
		module: "./dist/index.mjs",
		types: "./dist/index.d.cts",
		exports: {
			".": {
				import: { types: "./dist/index.d.mts", default: "./dist/index.mjs" },
				require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
			},
			"./package.json": "./package.json",
		},
		files: ["dist"],
		publishConfig: { access: "public", provenance: true, tag: "latest" },
		scripts: {
			build: "tsdown",
			test: "bun test",
			typecheck: "tsc -p tsconfig.json && tsc -p tsconfig.test.json",
			lint: "biome ci --error-on-warnings .",
			"lint:package": "publint --strict && attw --pack . --profile node16",
		},
		devDependencies: { "@types/bun": "^1.4.4", typescript: "^7.0.2" },
	}
	return {
		"packages/core/package.json": json(pkg),
		"packages/core/tsconfig.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: { lib: ["ES2022"], types: [] },
			include: ["src"],
			exclude: ["src/**/*.test.ts"],
		}),
		"packages/core/tsconfig.test.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: { lib: ["ES2022"], types: ["bun"], isolatedDeclarations: false },
			include: ["src"],
		}),
		"packages/core/tsdown.config.ts": `import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
})
`,
		"packages/core/src/index.ts": starter.src,
		"packages/core/src/index.test.ts": starter.test,
	}
}

