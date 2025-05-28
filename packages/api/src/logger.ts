import pc from "picocolors";
import {type DestinationStream, type LevelWithSilent, pino} from "pino";

type LogMode = "pretty" | "json";
type LogLevel = LevelWithSilent;

type Log = {
    level: 60 | 50 | 40 | 30 | 20 | 10;
    time: number;
    service: string;
    msg: string;
    error?: Error;
};

function determineServiceName(): string {
    if (process.env.SERVICE_NAME) {
        return process.env.SERVICE_NAME;
    }

    const execPath = process.argv[1] || '';
    if (execPath.includes('workers')) return 'workers';
    if (execPath.includes('api')) return 'api';
    if (execPath.includes('ponder')) return 'indexer';
    return 'app';
}

function shouldUseSimpleLogging(): boolean {
    // Use simple console logging in development or when not in Docker
    return (
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'dev' ||
        !process.env.DOCKER_CONTAINER ||
        process.env.SIMPLE_LOGGING === 'true'
    );
}

function createSimpleLogger() {
    const serviceName = determineServiceName();
    const level = (process.env.LOG_LEVEL as LogLevel) || 'info';

    const levelValues = {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60,
        silent: Infinity
    };

    const currentLevelValue = levelValues[level] || 30;

    const shouldLog = (logLevel: number) => logLevel >= currentLevelValue;

    const formatMessage = (level: string, msgOrOptions: string | object, error?: Error) => {
        const timestamp = new Date().toISOString();
        const service = serviceName.padEnd(10, " ");

        let message: string;
        if (typeof msgOrOptions === 'string') {
            message = msgOrOptions;
        } else {
            message = (msgOrOptions as any).msg || JSON.stringify(msgOrOptions);
        }

        let output = `${timestamp} ${level.toUpperCase().padEnd(5)} ${service} ${message}`;

        if (error) {
            output += `\n${error.stack || error.message}`;
        }

        return output;
    };

    return {
        fatal: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(60)) console.error(formatMessage('fatal', msgOrOptions, error));
        },
        error: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(50)) console.error(formatMessage('error', msgOrOptions, error));
        },
        warn: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(40)) console.warn(formatMessage('warn', msgOrOptions, error));
        },
        info: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(30)) console.log(formatMessage('info', msgOrOptions, error));
        },
        debug: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(20)) console.log(formatMessage('debug', msgOrOptions, error));
        },
        trace: (msgOrOptions: string | object, error?: Error) => {
            if (shouldLog(10)) console.log(formatMessage('trace', msgOrOptions, error));
        },
        flush: () => Promise.resolve(),
    };
}

function createPinoLogger() {
    const level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    const mode = (process.env.LOG_FORMAT as LogMode) === 'json' ? 'json' : 'pretty';
    const serviceName = determineServiceName();

    const stream: DestinationStream = {
        write(logString: string) {
            if (mode === "json") {
                console.log(logString.trimEnd());
                return;
            }
            const log = JSON.parse(logString) as Log;
            const prettyLog = format(log);
            console.log(prettyLog);
        },
    };

    const logger = pino(
        {
            level,
            serializers: {
                error: pino.stdSerializers.wrapErrorSerializer((error) => {
                    error.meta = Array.isArray(error.meta) ? error.meta.join("\n") : error.meta;
                    // @ts-ignore
                    error.type = undefined;
                    return error;
                }),
            },
            base: undefined,
        },
        stream,
    );

    // Helper to normalize input to the structured format
    const normalizeLogInput = (msgOrOptions: string | object, error?: Error) => {
        if (typeof msgOrOptions === 'string') {
            return {msg: msgOrOptions, service: serviceName, error};
        }
        return {service: serviceName, ...msgOrOptions};
    };

    return {
        fatal: (msgOrOptions: string | object, error?: Error) =>
            logger.fatal(normalizeLogInput(msgOrOptions, error)),
        error: (msgOrOptions: string | object, error?: Error) =>
            logger.error(normalizeLogInput(msgOrOptions, error)),
        warn: (msgOrOptions: string | object, error?: Error) =>
            logger.warn(normalizeLogInput(msgOrOptions, error)),
        info: (msgOrOptions: string | object, error?: Error) =>
            logger.info(normalizeLogInput(msgOrOptions, error)),
        debug: (msgOrOptions: string | object, error?: Error) =>
            logger.debug(normalizeLogInput(msgOrOptions, error)),
        trace: (msgOrOptions: string | object, error?: Error) =>
            logger.trace(normalizeLogInput(msgOrOptions, error)),
        flush: () => new Promise((resolve) => logger.flush(resolve)),
    };
}

const levels = {
    60: {label: "FATAL", colorLabel: pc.bgRed("FATAL")},
    50: {label: "ERROR", colorLabel: pc.red("ERROR")},
    40: {label: "WARN ", colorLabel: pc.yellow("WARN ")},
    30: {label: "INFO ", colorLabel: pc.green("INFO ")},
    20: {label: "DEBUG", colorLabel: pc.blue("DEBUG")},
    10: {label: "TRACE", colorLabel: pc.gray("TRACE")},
} as const;

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
});

const format = (log: Log) => {
    const time = timeFormatter.format(new Date(log.time));
    const levelObject = levels[log.level ?? 30];
    let prettyLog: string[];

    if (pc.isColorSupported) {
        const level = levelObject.colorLabel;
        const service = log.service ? pc.cyan(log.service.padEnd(10, " ")) : "";
        const messageText = pc.reset(log.msg);
        prettyLog = [`${pc.gray(time)} ${level} ${service} ${messageText}`];
    } else {
        const level = levelObject.label;
        const service = log.service ? log.service.padEnd(10, " ") : "";
        prettyLog = [`${time} ${level} ${service} ${log.msg}`];
    }

    if (log.error) {
        if (log.error.stack) {
            prettyLog.push(log.error.stack);
        } else {
            prettyLog.push(`${log.error.name}: ${log.error.message}`);
        }
        if ("where" in log.error) {
            prettyLog.push(`where: ${log.error.where as string}`);
        }
        if ("meta" in log.error) {
            prettyLog.push(log.error.meta as string);
        }
    }

    return prettyLog.join("\n");
};

export const logger = shouldUseSimpleLogging() ? createSimpleLogger() : createPinoLogger();