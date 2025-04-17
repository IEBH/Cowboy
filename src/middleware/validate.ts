// middleware/validate.ts
// @ts-ignore
import joyful from '@momsfriendlydevco/joyful';
import type { CowboyRequestInterface } from '#lib/request';
import type { CowboyResponseInterface } from '#lib/response';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';
import type { Env } from '#types';

// Assuming Joyful validator has a type 'JoyfulValidator' or similar, else use 'any'
type JoyfulValidator = any;

/**
* Run a Joi / Joyful validation function against a specific subkey within `req`.
*
* @param subkey The key within the `req` object to validate ('body', 'query', 'params', 'headers').
* @param validator The Joyful schema or validation function.
* @returns Either a successful middleware cycle (if validation succeeds) or a call to `res.status(400)` if failed
*/
export default function CowboyMiddlewareValidate(
	subkey: keyof Pick<CowboyRequestInterface, 'body' | 'query' | 'params' | 'headers'>,
	validator: JoyfulValidator
): CowboyMiddlewareFunction {

	return (req: CowboyRequestInterface, res: CowboyResponseInterface, _env: Env): void | CowboyResponseInterface => {
		const dataToValidate = req[subkey];
		let joyfulResult = joyful(dataToValidate, validator);

		if (joyfulResult !== true) { // Failed body validation?
			return res
				.status(400)
				.send(joyfulResult)
		}
	};
}