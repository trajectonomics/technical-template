/** The subject every bootstrap commit carries. */
export const COMMIT_SUBJECT =
	"chore: bootstrap project from template and remove setup-the-repo skill"

/** The bootstrap commit message, with one trailer per co-author. */
export function commitMessage(coAuthors: readonly string[]): string {
	const trailers = coAuthors
		.map((author) => author.trim())
		.filter(Boolean)
		.map((author) => `Co-Authored-By: ${author}`)
	if (trailers.length === 0) return COMMIT_SUBJECT
	return [COMMIT_SUBJECT, "", ...trailers].join("\n")
}
