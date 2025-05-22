import { createQueue } from './queue.js';
export const mutex = (fn) => {
    const queue = createQueue({
        initialStart: true,
        browser: false,
        concurrency: 1,
        worker(params) {
            return fn(params);
        },
    });
    return Object.assign(queue.add, queue);
};
export const createMutex = () => {
    const queue = createQueue({
        initialStart: true,
        browser: false,
        concurrency: 1,
        worker({ fn, params }) {
            return fn(params);
        },
    });
    const mutex = (fn) => (params) => queue.add({ fn, params });
    return Object.assign(mutex, queue);
};
//# sourceMappingURL=mutex.js.map