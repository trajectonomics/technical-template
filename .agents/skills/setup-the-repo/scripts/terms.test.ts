import { describe, expect, it } from "bun:test"
import { deriveStarterName, glossaryContent, toKebabCase } from "./terms"
import { testAnswers } from "./testing"

describe("deriveStarterName", () => {
	it.each([
		["Invoice", "Invoice"],
		["invoice", "Invoice"],
		["Tax Rate", "TaxRate"],
		["tax_rate", "TaxRate"],
		["Entity", "Entity"],
		["Order 2 line", "Order2Line"],
		["", "Example"],
		["   ", "Example"],
		["2FA", "Example"],
		["Error", "Example"],
		["Domain Error", "Example"],
		["税款", "Example"],
	])("turns %p into %p", (term, expected) => {
		expect(deriveStarterName(term)).toBe(expected)
	})
})

describe("toKebabCase", () => {
	it("splits PascalCase into a file name", () => {
		expect(toKebabCase("TaxRate")).toBe("tax-rate")
		expect(toKebabCase("Invoice")).toBe("invoice")
		expect(toKebabCase("Example")).toBe("example")
	})
})

describe("glossaryContent", () => {
	it("holds every term in order and always the Invariant", () => {
		const glossary = glossaryContent(
			testAnswers({
				domainTerms: [
					{ term: "Invoice", definition: "A bill." },
					{ term: "Tax Rate", definition: "A percentage." },
					{ term: "Settlement", definition: "A payment." },
				],
			}),
		)
		expect(glossary).toContain("### Invoice\nA bill.")
		expect(glossary).toContain("### Tax Rate\nA percentage.")
		expect(glossary).toContain("### Settlement\nA payment.")
		expect(glossary.indexOf("### Invoice")).toBeLessThan(glossary.indexOf("### Tax Rate"))
		expect(glossary.indexOf("### Tax Rate")).toBeLessThan(glossary.indexOf("### Settlement"))
		expect(glossary).toContain("### Invariant")
	})

	it("holds no invented term when the user gave none", () => {
		const glossary = glossaryContent(testAnswers({ domainTerms: [] }))
		expect(glossary).not.toContain("Entity")
		expect(glossary).toContain("## Core Terms")
	})
})
