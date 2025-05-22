import pc from "picocolors";
import { pino } from "pino";
export function createLogger({ level, mode = "pretty", }) {
    const stream = {
        write(logString) {
            if (mode === "json") {
                console.log(logString.trimEnd());
                return;
            }
            const log = JSON.parse(logString);
            const prettyLog = format(log);
            console.log(prettyLog);
        },
    };
    const logger = pino({
        level,
        serializers: {
            error: pino.stdSerializers.wrapErrorSerializer((error) => {
                error.meta = Array.isArray(error.meta)
                    ? error.meta.join("\n")
                    : error.meta;
                //@ts-ignore
                error.type = undefined;
                return error;
            }),
        },
        // Removes "pid" and "hostname" properties from the log.
        base: undefined,
    }, stream);
    return {
        fatal(options) {
            logger.fatal(options);
        },
        error(options) {
            logger.error(options);
        },
        warn(options) {
            logger.warn(options);
        },
        info(options) {
            logger.info(options);
        },
        debug(options) {
            logger.debug(options);
        },
        trace(options) {
            logger.trace(options);
        },
        flush: () => new Promise((resolve) => logger.flush(resolve)),
    };
}
const levels = {
    60: { label: "FATAL", colorLabel: pc.bgRed("FATAL") },
    50: { label: "ERROR", colorLabel: pc.red("ERROR") },
    40: { label: "WARN ", colorLabel: pc.yellow("WARN ") },
    30: { label: "INFO ", colorLabel: pc.green("INFO ") },
    20: { label: "DEBUG", colorLabel: pc.blue("DEBUG") },
    10: { label: "TRACE", colorLabel: pc.gray("TRACE") },
};
const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
});
const format = (log) => {
    const time = timeFormatter.format(new Date(log.time));
    const levelObject = levels[log.level ?? 30];
    let prettyLog;
    if (pc.isColorSupported) {
        const level = levelObject.colorLabel;
        const service = log.service ? pc.cyan(log.service.padEnd(10, " ")) : "";
        const messageText = pc.reset(log.msg);
        prettyLog = [`${pc.gray(time)} ${level} ${service} ${messageText}`];
    }
    else {
        const level = levelObject.label;
        const service = log.service ? log.service.padEnd(10, " ") : "";
        prettyLog = [`${time} ${level} ${service} ${log.msg}`];
    }
    if (log.error) {
        if (log.error.stack) {
            prettyLog.push(log.error.stack);
        }
        else {
            prettyLog.push(`${log.error.name}: ${log.error.message}`);
        }
        if ("where" in log.error) {
            prettyLog.push(`where: ${log.error.where}`);
        }
        if ("meta" in log.error) {
            prettyLog.push(log.error.meta);
        }
    }
    return prettyLog.join("\n");
};
//# sourceMappingURL=logger.js.map