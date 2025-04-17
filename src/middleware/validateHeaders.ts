// middleware/validateHeaders.ts
import CowboyMiddlewareValidate from '#middleware/validate';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

type JoyfulValidator = any;

export default function CowboyMiddlewareValidateHeaders(validator: JoyfulValidator): CowboyMiddlewareFunction {
	return CowboyMiddlewareValidate('headers', validator);
}