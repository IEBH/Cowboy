// lib/debug.ts
export interface CowboyDebugger {
	(...msg: any[]): void;
	enabled: boolean;
}

const CowboyDebug: CowboyDebugger = (...msg: any[]) => {
	if (!CowboyDebug.enabled) return;
	console.log('COWBOY-DEBUG', ...msg.map(m =>
		typeof m === 'string' ? m
		: JSON.stringify(m)
	));
};

CowboyDebug.enabled = false;

export default CowboyDebug;