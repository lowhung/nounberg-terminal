import { type Queue } from './queue.js';
export type Mutex<T, P> = ((params: T) => Promise<P>) & Queue<P, T>;
export declare const mutex: <T, P>(fn: (params: T) => Promise<P>) => Mutex<T, P>;
export declare const createMutex: () => (<T, P>(fn: (params: T) => Promise<P>) => (params: T) => Promise<P>) & Queue<any, {
    fn: (params: any) => Promise<any>;
    params: any;
}>;
//# sourceMappingURL=mutex.d.ts.map