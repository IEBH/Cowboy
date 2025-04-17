// middleware/validateBody.ts
import CowboyMiddlewareValidate from '#middleware/validate';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

type JoyfulValidator = any;

export default function CowboyMiddlewareValidateBody(validator: JoyfulValidator): CowboyMiddlewareFunction {
	return CowboyMiddlewareValidate('body', validator);
}