// lib/testkit.ts
import Debug, { type Debugger } from 'debug';
import fs from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import toml from 'toml';
import type { AxiosInstance } from 'axios'; // Import Axios type if needed
import type { Context } from 'mocha'; // Import Mocha type

const debug: Debugger = Debug('cowboy');

/**
* The currently active worker (if any)
*/
export let worker: ChildProcess | null = null;

interface StartOptions {
	axios: AxiosInstance | null;
	server?: boolean;
	debug?: boolean;
	logOutput?: (line: string) => void;
	logOutputErr?: (line: string) => void;
	host?: string;
	port?: number;
	logLevel?: 'debug' | 'info' | 'log' | 'warn' | 'error' | 'none'; // Wrangler log levels
}

interface WranglerConfig {
	main?: string;
	send_metrics?: boolean;
	// Add other wrangler.toml properties as needed
	[key: string]: any;
}

/**
* Boot a wranger instance in the background
*
* @param options Additional options to mutate behaviour
* @returns A promise which resolves when the operation has completed
*/
export function start(options?: StartOptions): Promise<void> {
	const settings: Required<StartOptions> = {
		axios: null,
		server: true,
		debug: false,
		logOutput: (output: string) => console.log('WRANGLER>', output),
		logOutputErr: (output: string) => console.error('WRANGLER!', output),
		host: '127.0.0.1',
		port: 8787,
		logLevel: 'log',
		...(options || {}), // Ensure options is an object
	};

	if (settings.debug) Debug.enable('cowboy');
	debug('Start cowboy testkit');
	let wranglerConfig: WranglerConfig; // Eventual wrangler config

	return Promise.resolve()
		// Read in project `wrangler.toml` {{{
		.then(() => fs.readFile('wrangler.toml', 'utf8'))
		.then(contents => {
			try {
				return toml.parse(contents) as WranglerConfig;
			} catch (e: any) {
				debug('Error parsing wrangler.toml', e);
				throw new Error(`Failed to parse wrangler.toml: ${e.message}`);
			}
		})
		.then(config => {
			debug('Read config', config);
			if (!Object.hasOwn(config, 'send_metrics')) throw new Error('Please append `send_metrics = false` to wrangler.toml to Warngler asking questions during boot');
			wranglerConfig = config;
		})
		// }}}
		// Launch worker {{{
		.then(() => {
			if (!settings.server) return Promise.resolve(); // Skip server start if disabled
			debug('Running Wrangler against script', wranglerConfig.main || '[entry point not specified]');

			let isRunning = false;
			return new Promise<void>((resolve, reject) => {
				if (worker) {
					debug('Wrangler already seems to be running (PID:', worker.pid, '). Stopping previous instance first.');
					stop(); // Ensure previous instance is stopped
				}

				const wranglerArgs = [
					'./node_modules/.bin/wrangler',
					'dev',
					`--host=${settings.host}`, // TODO: Check with MC whether to use --ip for host
					`--port=${settings.port}`,
					`--log-level=${settings.logLevel}`,
					...(debug.enabled ? [
						'--var=COWBOY_DEBUG:1'
					]: []),
				];

				debug('Spawning Wrangler with args:', wranglerArgs.join(' '));

				worker = spawn('node', wranglerArgs, { stdio: 'pipe' }); // Use pipe for stdio

				worker.stdout?.on('data', (data: Buffer) => {
					const output = data.toString().replace(/\r?\n$/, '');

					if (!isRunning && /Ready on https?:\/\//.test(output)) {
						debug('Wrangler ready!');
						isRunning = true;
						resolve();
					}

					settings.logOutput(output);
				});

				worker.stderr?.on('data', (data: Buffer) => {
					settings.logOutputErr(data.toString().replace(/\r?\n$/, ''));
				});

				worker.on('error', (err: Error) => {
					debug('Wrangler spawn error:', err);
					worker = null; // Clear worker ref on error
					reject(err);
				});

				worker.on('close', (code: number | null) => {
					debug(`Wrangler exited with code ${code}`);
					worker = null;
					if (!isRunning) { // Reject if closed before becoming ready
						reject(new Error(`Wrangler process exited prematurely with code ${code}`));
					}
				});

				// Handle cases where wrangler might exit immediately
				worker.on('exit', (code: number | null) => {
					debug(`Wrangler process exited event with code ${code}`);
					if (worker) worker.kill(); // Ensure cleanup if exit event fires early
					worker = null;
					if (!isRunning) {
						reject(new Error(`Wrangler process exited before ready state with code ${code}`));
					}
				});
			});
		})
		// }}}
		// Mutate axios if provided {{{
		.then(() => {
			if (settings.axios) {
				const baseURL = `http://${settings.host}:${settings.port}`;
				debug('Setting axios BaseURL to', baseURL);
				settings.axios.defaults.baseURL = baseURL;
			}
		})
		// }}}
		.catch(err => {
			debug('Error during testkit start:', err);
			stop(); // Attempt cleanup on error
			throw err; // Re-throw the error
		});
}

/**
* Stop background wrangler instances
* @returns Promise resolving when the process is stopped (or immediately if no process)
*/
export function stop(): Promise<void> {
	return new Promise((resolve) => {
		if (!worker || worker.killed) {
			if (worker?.killed) debug('Wrangler worker already killed.');
			else debug('No active Wrangler worker to stop.');
			worker = null;
			return resolve();
		}

		debug(`Stopping active Wrangler worker PID #${worker.pid}`);
		worker.kill('SIGTERM');

		// Add a timeout to forcefully kill if it doesn't stop gracefully
		const killTimeout = setTimeout(() => {
			if (worker && !worker.killed) {
				debug(`Wrangler worker PID #${worker.pid} did not exit gracefully, sending SIGKILL.`);
				worker.kill('SIGKILL');
			}
		}, 3000); // 3 seconds grace period

		worker.on('close', (code) => {
			debug(`Wrangler (PID: ${worker?.pid}) stopped with code ${code}.`);
			clearTimeout(killTimeout);
			worker = null;
			resolve();
		});

		worker.on('error', (err) => {
			debug(`Error stopping Wrangler worker PID #${worker?.pid}:`, err);
			clearTimeout(killTimeout);
			worker = null; // Assume it's gone even on error
			resolve();
		});
	});
}

/**
* Inject various Mocha before/after tooling
* @param options Additional options to pass to `start()`
*/
export function cowboyMocha(options?: StartOptions) {

	before('start cowboy/testkit', function (this: Context) {
		this.timeout(30 * 1000);
		return start(options);
	});

	after('stop cowboy/testkit', function (this: Context) {
		this.timeout(10 * 1000)
		return stop();
	});

}

export default {
	cowboyMocha,
	stop,
	start,
};