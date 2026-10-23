import { Clock, Sleep } from './http.types';

export const systemClock: Clock = () => Date.now();
export const systemSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
