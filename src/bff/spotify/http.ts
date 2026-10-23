export type FetchFn = typeof fetch;
export type Clock = () => number;
export type Sleep = (ms: number) => Promise<void>;

export const systemClock: Clock = () => Date.now();
export const systemSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
