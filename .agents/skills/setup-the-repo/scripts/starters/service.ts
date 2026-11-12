import type { Starter } from "./types"

/** The service starter: a deterministic health payload and handler. */
export function serviceStarter(packageName: string): Starter {
	const src = `/**
 * Service handler for ${packageName}.
 */

export interface HealthStatus {
	readonly status: "ok" | "degraded"
	readonly service: string
	readonly uptimeSeconds: number
}

export function getHealthStatus(serviceName: string, startTime: number): HealthStatus {
	return Object.freeze({
		status: "ok",
		service: serviceName,
		uptimeSeconds: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
	})
}

export function handleRequest(urlPath: string, serviceName: string, startTime: number): Response {
	if (urlPath === "/health" || urlPath === "/healthz") {
		const body = JSON.stringify(getHealthStatus(serviceName, startTime))
		return new Response(body, {
			status: 200,
			headers: { "content-type": "application/json" },
		})
	}
	return new Response("Not Found", { status: 404 })
}
`
	const test = `import { describe, expect, it } from "bun:test"
import { type HealthStatus, getHealthStatus, handleRequest } from "./index"

describe("Service Handler", () => {
	it("returns operational health status", () => {
		const health = getHealthStatus("test-service", Date.now())
		expect(health.status).toBe("ok")
		expect(health.service).toBe("test-service")
	})

	it("handles /health route with 200 JSON", async () => {
		const res = handleRequest("/health", "test-service", Date.now())
		expect(res.status).toBe(200)
		const body = (await res.json()) as HealthStatus
		expect(body.service).toBe("test-service")
	})

	it("returns 404 for unknown route", () => {
		expect(handleRequest("/unknown", "test-service", Date.now()).status).toBe(404)
	})
})
`
	return { src, test }
}
