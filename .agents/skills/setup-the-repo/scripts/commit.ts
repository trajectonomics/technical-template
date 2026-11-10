/** The subject every bootstrap commit carries. */
export const COMMIT_SUBJECT =
	"chore: bootstrap project from template and remove setup-the-repo skill"

/**
 * Builds the bootstrap commit message. Co-author trailers are appended only
 * when the caller passed `--co-author`, so an agent's commit is attributable
 * without setup guessing who ran it.
 */
export function commitMessage(coAuthors: readonly string[]): string {
	const trailers = coAuthors
		.map((author) => author.trim())
		.filter(Boolean)
		.map((author) => `Co-Authored-By: ${author}`)
	if (trailers.length === 0) return COMMIT_SUBJECT
	return [COMMIT_SUBJECT, "", ...trailers].join("\n")
}
