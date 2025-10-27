type EventListener = (...args: any[]) => void;

export default class EventEmitter {
	private _events: Map<string, EventListener[]>;
	private _maxListeners: number;

	constructor() {
		this._events = new Map();
		this._maxListeners = 0;
	}

	setMaxListeners(n: number): this {
		this._maxListeners = n;
		return this;
	}

	emit(eventType: string, ...args: any[]): boolean {
		if (eventType === 'error' && (!this._events.has('error') || !this._events.get('error')!.length)) {
			if (args[0] instanceof Error) {
				throw args[0];
			}
			throw new TypeError('Uncaught, unspecified "error" event.');
		}
		const listeners = this._events.get(eventType);
		if (!listeners) {
			return false;
		}
		listeners.forEach(listener => listener.apply(this, args));
		return true;
	}

	// Emit multiple events
	emits(types: string[], values: any[][]): void {
		for (let i = 0; i < types.length; i++) {
			const val = i < values.length ? values[i] : values[values.length - 1];
			this.emit(types[i], ...val);
		}
	}

	on(eventType: string, listener: EventListener): this {
		if (!this._events.has(eventType)) {
			this._events.set(eventType, []);
		}
		const listeners = this._events.get(eventType)!;
		if (this._maxListeners && listeners.length >= this._maxListeners) {
			throw new Error(`Max listeners exceeded for event '${eventType}'`);
		}
		listeners.push(listener);
		return this;
	}

	once(eventType: string, listener: EventListener): this {
		const onceListener = (...args: any[]) => {
			this.removeListener(eventType, onceListener);
			listener(...args);
		};
		return this.on(eventType, onceListener);
	}

	off(eventType: string, listener: EventListener): this {
		const listeners = this._events.get(eventType);
		if (!listeners) {
			return this;
		}
		const index = listeners.indexOf(listener);
		if (index === -1) {
			return this;
		}
		listeners.splice(index, 1);
		if (listeners.length === 0) {
			this._events.delete(eventType);
		}
		return this;
	}

	removeAllListeners(eventType?: string): this {
		if (!eventType) {
			this._events.clear();
		} else {
			this._events.delete(eventType);
		}
		return this;
	}

	listeners(eventType: string): EventListener[] {
		return this._events.get(eventType) || [];
	}

	listenerCount(eventType: string): number {
		return this._events.get(eventType)?.length || 0;
	}

	addListener(eventType: string, listener: EventListener): this {
		return this.on(eventType, listener);
	}

	removeListener(eventType: string, listener: EventListener): this {
		return this.off(eventType, listener);
	}

	static defaultMaxListeners = 10;
}
