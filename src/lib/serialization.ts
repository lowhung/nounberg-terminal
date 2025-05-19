import {z} from "zod";

export function zodTransform<T>(schema: z.ZodType<T>) {
    return (data: any): T => {
        const stringified = JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? Number(value) : value
        );

        const parsedData = JSON.parse(stringified);
        return schema.parse(parsedData);
    };
}