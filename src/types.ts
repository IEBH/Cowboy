// types.ts
// This file can be used for types shared across multiple core modules if needed.
// Based on the provided code, most core types are specific to their modules (Request, Response, Cowboy).
// We'll define Env here as it's used across fetch/scheduled and middleware.

/**
 * Represents the Cloudflare Worker environment bindings.
 * Can be extended by the user for specific bindings.
 */
export interface Env extends Record<string, any> {
	// Example: MY_KV_NAMESPACE: KVNamespace;
	// Example: MY_SECRET: string;
	COWBOY_DEBUG?: string | boolean;
}