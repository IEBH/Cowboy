// middleware/validateParams.ts
import CowboyMiddlewareValidate from '#middleware/validate';
import type { CowboyMiddlewareFunction } from '#lib/cowboy';

type JoyfulValidator = any;

export default function CowboyMiddlewareValidateParams(validator: JoyfulValidator): CowboyMiddlewareFunction {
	return CowboyMiddlewareValidate('params', validator);
}