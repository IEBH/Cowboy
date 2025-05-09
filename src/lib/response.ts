// lib/response.ts
export interface CowboyResponseInterface {
	body: any;
	code: number | null;
	headers: Record<string, string>;
	hasSent: boolean;
	CloudflareResponse: typeof Response;
	set(options: Record<string, string> | string, value?: string): this;
	type(type: string): this;
	send(data: any, end?: boolean): this;
	end(data?: any): this;
	status(code: number): this;
	sendStatus(code: number, data?: any, end?: boolean): this;
	toCloudflareResponse(): Response;
}

/**
* Generic all-in-one response wrapper to mangle responses without having to memorize all the weird syntax that Wrangler / Cloudflare workers need
*/
export default class CowboyResponse implements CowboyResponseInterface {
	body: any = '';
	code: number | null = null;
	headers: Record<string, string> = {};
	hasSent: boolean = false;
	CloudflareResponse: typeof Response = Response; // Use global Response

	/**
	* Assign various output headers
	* @param options Either an header object to be merged or the header to set
	* @param [value] If `options` is a string, the value of the header
	* @returns This chainable instance
	*/
	set(options: Record<string, string> | string, value?: string): this {
		if (typeof options === 'string' && value !== undefined) {
			this.headers[options] = value;
		} else if (typeof options === 'object') {
			Object.assign(this.headers, options);
		}

		return this;
	}


	/**
	* ExpressJS-like type setter and shortcut function
	* Recognises various shorthand types or defaults to setting a MIME type
	* @param type The type string to set, can be a shorthand string or a mime type
	* @returns This chainable instance
	*/
	type(type: string): this {
		switch (type) {
			case 'html': return this.set('Content-Type', 'text/html');
			case 'json': return this.set('Content-Type', 'application/json');
			case 'text': return this.set('Content-Type', 'text/plain');
			default:
				if (!/\//.test(type)) throw new Error(`Shorthand type "${type}" is not recognised and does not look like a valid mime type`);
				return this.set('Content-Type', type);
		}
	}


	/**
	* Send data and (optionally) mark the response as complete
	* @param data The data to transmit
	* @param [end=true] Whether to also end the transmision
	* @returns This chainable instance
	*/
	send(data: any, end: boolean = true): this {
		if (this.code === null) this.code = 200; // Assume OK if not told otherwise

		if (
			typeof data === 'string'
			|| data instanceof FormData
			|| data instanceof ReadableStream
			|| data instanceof URLSearchParams
		) {
			this.body = data;
		} else {
			this.body = JSON.stringify(data);
		}

		// Mark transmition as ended
		if (end) this.hasSent = true;

		return this;
	}


	/**
	* Mark the transmission as complete
	* @param [data] Optional data to send before ending
	* @returns This chainable instance
	*/
	end(data?: any): this {
		if (data !== undefined) this.send(data);
		this.hasSent = true;
		return this;
	}


	/**
	* Set the status code we are responding with
	* @param code The HTTP response code to respond with
	* @returns This chainable instance
	*/
	status(code: number): this {
		this.code = code;
		if (!this.body && this.body !== '') { // Allow empty string body
			this.body = this.code >= 200 && this.code <= 299
				? 'ok' // Set body payload if we don't already have one
				: `${this.code} Fail`;
		}

		return this;
	}


	/**
	* Set the response status code and (optionally) end the transmission
	* @param code The HTTP response code to respond with
	* @param [data] Optional data to send before ending (DEPRECATED - Use status().send())
	* @param [end=true] Whether to also end the transmission
	* @returns This chainable instance
	*/
	sendStatus(code: number, data?: any, end: boolean = true): this {
		if (data) throw new Error('Data is not allowed with CowboyResponse.sendStatus(code) - use CowBoyresponse.status(CODE).send(DATA) instead');
		this.status(code);
		if (end) this.end();
		return this;
	}


	/**
	* Convert the current CowboyResponse into a CloudflareResponse object
	* @returns The cloudflare output object
	*/
	toCloudflareResponse(): Response {
		let cfOptions = {
			status: this.code ? this.code : undefined,
			headers: this.headers,
		};
		console.log('Response', JSON.stringify({
			...cfOptions,
			body:
				typeof this.body == 'string' && this.body.length > 30 ? this.body.substr(0, 50) + '…'
				: this.body,
		}, null, '\t'));
		return new this.CloudflareResponse(this.body, cfOptions);
	}
}