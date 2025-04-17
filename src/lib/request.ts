// lib/request.ts
import debug from '#lib/debug';
import type { Cowboy } from '#lib/cowboy'; // Assuming this type definition exists

// Helper function (optional but good practice)
function errorToString(error: unknown): string {
	if (error instanceof Error) {
		return error.toString();
	} else if (typeof error === 'string') {
		return error;
	}
	return 'Unknown error';
}

// Define the structure of the 'props' object expected by the constructor
interface CowboyRequestConstructorProps {
	router: Cowboy; // Assuming Cowboy is the router type
	pathTidy: (path: string) => string;
	// Add any other properties potentially passed via 'props' in original JS
}

// Define the complete interface for the resulting CowboyRequest instance
// This includes properties set directly, copied from cfReq (via prototype keys), and from props.
export interface CowboyRequestInterface {
	// --- Properties explicitly set/overwritten in constructor ---
	path: string;
	hostname: string;
	query: Record<string, string>;
	headers: Record<string, string>;
	/** Original raw text source function, may be overwritten with string in parseBody */
	text: (() => Promise<string>) | string;
	/** Parsed body (initially object with methods, later the parsed data) */
	body: any;
	routePath: string;
	params: Record<string, string | undefined>;

	// --- Properties expected from `props` ---
	router: Cowboy;
	pathTidy: (path: string) => string;

	// --- Properties copied from cfReq instance (keys based on Request.prototype) ---
	// List the common/expected ones. Add more if your code relies on them.
	method: string;
	url: string;
	// Potentially others like:
	// redirect: RequestRedirect;
	// signal: AbortSignal;
	// cache: RequestCache;
	// keepalive: boolean;
	// etc...
	// Also methods (ensure they are bound correctly if needed):
	clone: () => Request;
	arrayBuffer: () => Promise<ArrayBuffer>;
	blob: () => Promise<Blob>;
	formData: () => Promise<FormData>;
	json: () => Promise<any>;

	// --- Methods defined on CowboyRequest ---
	parseBody(forceType?: string): Promise<void>;
	toString(): string;
}

/**
* Tiny wrapper around Wrangler to wrap its default Request object in an Express-like structure
* Mimics original JS structure by copying properties rather than extending Request.
*/
export default class CowboyRequest implements CowboyRequestInterface {
	// --- Declare ALL properties from the interface ---
	// Use '!' (definite assignment assertion) because the constructor logic guarantees assignment.
	path!: string;
	hostname!: string;
	query!: Record<string, string>;
	headers!: Record<string, string>;
	text!: (() => Promise<string>) | string;
	body: any;
	router!: Cowboy;
	pathTidy!: (path: string) => string;
	routePath!: string;
	params!: Record<string, string | undefined>;

	// Declare copied properties/methods
	method!: string;
	url!: string;
	clone!: () => Request;
	arrayBuffer!: () => Promise<ArrayBuffer>;
	blob!: () => Promise<Blob>;
	formData!: () => Promise<FormData>;
	json!: () => Promise<any>;
	// Add declarations for any other Request properties/methods you copy and use

	constructor(cfReq: Request, props: CowboyRequestConstructorProps) {
		// 1. Copy properties from cfReq instance corresponding to Request.prototype keys
		//    This mimics the original Object.assign(this, Object.fromEntries(...))
		//    Crucially, bind methods to cfReq to ensure 'this' context is correct when called later.
		const protoKeys = Object.keys(Request.prototype);
		for (const key of protoKeys) {
			const cfReqValue = (cfReq as any)[key];
			if (typeof cfReqValue === 'function') {
				(this as any)[key] = cfReqValue.bind(cfReq);
			} else {
				// Directly assign non-function prototype-based properties
				// Note: This might include getters; direct assignment gets the *value* at construction time.
				(this as any)[key] = cfReqValue;
			}
		}

		// 2. Copy properties from the `props` object
		//    This assumes `props` only contains properties declared in the interface
		Object.assign(this, props); // Typescript checks compatibility with declared props

		// 3. Explicit assignments (these overwrite any potentially copied values)
		const url = new URL(cfReq.url); // Use the originally passed cfReq
		// Use `this.pathTidy` which should now exist from the Object.assign above
		this.path = this.pathTidy(url.pathname);
		this.hostname = url.hostname;
		this.query = Object.fromEntries(url.searchParams);

		this.routePath = ''; // Eventually matching routePath segment
		this.params = {}; // Set empty object for path extraction

		// 4. Slurp the headers into a plain object (overwrites any copied 'headers' property/method)
		this.headers = Object.fromEntries(cfReq.headers.entries());

		// 5. Hold the raw text function (bound)
		//    This assigns to the `text` property declared above.
		this.text = cfReq.text.bind(cfReq);

		// 6. Set up the initial `body` object containing bound methods
		//    This assigns to the `body` property declared above.
		this.body = {
			json: cfReq.json.bind(cfReq),
			formData: cfReq.formData.bind(cfReq),
			text: cfReq.text.bind(cfReq),
		};
	}


	/**
	* Parse the body of an incoming request
	*
	* @param {String} [forceType] Whether to force a specific mime-type instead of using the header supplied format
	* @returns {Promise} A promise which will resolve when the body has been parsed
	*/
	async parseBody(forceType?: string): Promise<void> { // Added optional '?'
		// Use the plain 'headers' object stored on this instance
		let type = (forceType || this.headers['content-type'] || '')
		.replace(/^([a-z\-/]+).*$/, '$1'); // Scrap everything after the mime

		switch (type) {
			case 'json':
			case 'application/json':
				try {
					// Use the method stored within the 'this.body' object initially
					this.body = await this.body.json();
				} catch (e) {
					if (debug.enabled) debug('Failed to decode request body as JSON:', errorToString(e));
					throw new Error('Invalid JSON body');
				}
				break;
			case 'formData':
			case 'multipart/form-data':
			case 'application/x-www-form-urlencoded':
				try {
					const formData = await this.body.formData();
					this.body = Object.fromEntries(formData.entries());
				} catch (e) {
					if (debug.enabled) debug('Failed to decode multi-part body:', errorToString(e));
					throw new Error('Invalid multi-part encoded body');
				}
				break;
			case 'text':
			case 'text/plain':
				try {
					this.body = await this.body.text();
				} catch (e) {
					if (debug.enabled) debug('Failed to decode plain-text body:', errorToString(e));
					throw new Error('Invalid text body');
				}
				break;
			default:
			debug('Empty Body Payload - assuming raw payload');
				// Original JS overwrote `this.text` here. Replicate that.
				// We need to ensure the type of `this.text` allows a string.
				try {
					const rawText = await this.body.text(); // Call method from initial body obj
					this.text = rawText; // Assign the resolved string to this.text
					this.body = {}; // Set body to empty object like original
				} catch (e) {
					// Handle potential error during the final .text() call
					if (debug.enabled) debug('Failed to decode body as raw text:', errorToString(e));
					this.text = ''; // Assign empty string on error? Or rethrow? Original didn't specify.
					this.body = {};
					throw new Error('Invalid raw text body'); // Or handle differently
				}
				break;
		}
	}


	/**
	* Utility function to simplify an incoming request
	* @returns {String} Human readable string
	*/
	toString(): string {
		// Assumes 'this.method' was copied correctly in the constructor
		return `${this.method} ${this.path}`;
	}
}