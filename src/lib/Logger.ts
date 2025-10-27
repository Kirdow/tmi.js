export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Logger implementation
export default class Logger {
	private _levels: Record<LogLevel, number>;
	private _currentLevel: LogLevel;

	constructor() {
		this._levels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };
		this._currentLevel = 'error';
	}

	// Log a console message depending on the logging level
	private _log(level: LogLevel, message: string): void {
		if (this._levels[level] < this._levels[this._currentLevel]) {
			return;
		}
		// Format the date
		const date = new Date();
		const h = date.getHours();
		const m = date.getMinutes();
		const dateFormatted = `${(h < 10 ? '0' : '') + h}:${(m < 10 ? '0' : '') + m}`;
		console.log(`[${dateFormatted}] ${level}: ${message}`);
	}

	// Change the current logging level
	setLevel(level: LogLevel): void {
		this._currentLevel = level;
	}

	// Get the current logging level
	getLevel(): LogLevel {
		return this._currentLevel;
	}

	trace(message: string): void {
		this._log('trace', message);
	}

	debug(message: string): void {
		this._log('debug', message);
	}

	info(message: string): void {
		this._log('info', message);
	}

	warn(message: string): void {
		this._log('warn', message);
	}

	error(message: string): void {
		this._log('error', message);
	}

	fatal(message: string): void {
		this._log('fatal', message);
	}
}
