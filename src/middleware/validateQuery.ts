// middleware/validateQuery.ts
import CowboyMiddlewareValidate from '#middleware/validate';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

type JoyfulValidator = any;

export default function CowboyMiddlewareValidateQuery(validator: JoyfulValidator): CowboyMiddlewareFunction {
	return CowboyMiddlewareValidate('query', validator);
}