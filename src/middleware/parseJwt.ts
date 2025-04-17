// middleware/parseJwt.ts
import type { CowboyRequestInterface } from '#lib/request';
import type { CowboyResponseInterface } from '#lib/response';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

interface ParseJwtOptions {
	isJwt?: (req: CowboyRequestInterface, res: CowboyResponseInterface) => Promise<boolean> | boolean;
	tokenLocation?: 'body' | 'header'; // Optional: Specify where to find the token
	headerName?: string; // Optional: Specify header name if tokenLocation is 'header'
}

/**
* Return a parsing middleware layer which accepts a JWT and decodes the payload into req.body
* Expects the JWT to be the entire request body by default or in a specified header.
*
* @param options Additional options to mutate behaviour
*/
export default function CowboyMiddlewareParseJwt(options?: ParseJwtOptions): CowboyMiddlewareFunction {
	let settings = {
		async isJwt(req: CowboyRequestInterface, _res: CowboyResponseInterface) {
			return req.headers['content-type'] == 'application/jwt';
		},
		...options,
	};

	return async (req, res) => {
		const isJwt = await settings.isJwt(req, res);
		if (!isJwt) return;

		const text = typeof req.text === 'string' ? req.text : await req.text();
		const base64 = text.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
		req.body = JSON.parse(atob(base64));
	}
}