export const createShutdown = () => {
    const abortController = new AbortController();
    const callbacks = [];
    return {
        add: (callback) => {
            callbacks.push(callback);
        },
        kill: async () => {
            abortController.abort();
            await Promise.all(callbacks.map((callback) => callback()));
        },
        get isKilled() {
            return abortController.signal.aborted;
        },
        abortController,
    };
};
//# sourceMappingURL=shutdown.js.map