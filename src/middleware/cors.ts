// middleware/cors.ts
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

interface CorsOptions {
	attachOptions?: boolean;
	headers?: Record<string, string>;
}

/**
* Register a generic middleware to handle CORS requests
*
* @param options Additional options to mutate behaviour
* @returns A CowboyMiddlewareFunction
*/
export default function CowboyMiddlewareCORS(options?: CorsOptions): CowboyMiddlewareFunction {
	let settings = {
		attachOptions: true,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': '*',
			'Content-Type': 'application/json;charset=UTF-8',
		},
		...options,
	};

	return (req, res) => {
		// Always inject CORS headers
		res.set(settings.headers);

		// Inject various OPTIONS endpoints for CORS pre-flight
		if (settings.attachOptions && !req.router.loadedCors) {
			req.router.routes
				.filter(route => !route.methods.includes('OPTIONS'))
				.forEach(route =>
					route.paths.forEach(path =>
						req.router.options(path, (req, res) =>
							res.sendStatus(200)
						)
					)
				);

			req.router.loadedCors = true; // Mark we've already done this so we don't keep tweaking the router
		}
	}
}