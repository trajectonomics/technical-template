/** The starter files a generated repository gets. */
export interface Starter {
	/** The library module, written to `src/index.ts`. */
	readonly src: string
	/** The starter test, written to `src/index.test.ts`. */
	readonly test: string
	/** The executable entry written to `src/bin.ts`, for an Archetype that ships a command. */
	readonly bin?: string
}
