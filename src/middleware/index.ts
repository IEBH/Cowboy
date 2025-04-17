// middleware/index.ts
import cors from '#middleware/cors';
import parseJwt from '#middleware/parseJwt';
import validate from '#middleware/validate';
import validateBody from '#middleware/validateBody';
import validateHeaders from '#middleware/validateHeaders';
import validateParams from '#middleware/validateParams';
import validateQuery from '#middleware/validateQuery';

import type { CowboyMiddlewareFunction } from '#lib/cowboy';

// Define the structure of the exported object
interface CowboyMiddlewareRegistry {
	cors: typeof cors;
	parseJwt: typeof parseJwt;
	validate: typeof validate;
	validateBody: typeof validateBody;
	validateHeaders: typeof validateHeaders;
	validateParams: typeof validateParams;
	validateQuery: typeof validateQuery;
	[key: string]: (...args: any[]) => CowboyMiddlewareFunction; // Allow for extension
}

const middlewareRegistry: CowboyMiddlewareRegistry = {
	cors,
	parseJwt,
	validate,
	validateBody,
	validateHeaders,
	validateParams,
	validateQuery,
};

export default middlewareRegistry;