import axios from 'axios';
import {EventData} from "../types";
import logger from "../logger";

const WORKERS_JOB_API_URL = process.env.WORKERS_JOB_API_URL || 'http://workers-api:3001';

const httpClient = axios.create({
    baseURL: WORKERS_JOB_API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export async function addEventEnrichmentJob(eventData: EventData) {
    try {
        const response = await httpClient.post('/jobs/enrich-event', eventData);

        logger.debug(`Successfully enqueued job for event ${eventData.id}: ${response.data.jobId}`);
        return response.data;

    } catch (error: any) {
        if (error.response) {
            logger.error(`Workers API error for event ${eventData.id}: ${error.response.status} ${error.response.data}`);
        } else if (error.request) {
            logger.error(`Network error calling workers API for event ${eventData.id}: ${error.message}`);
        } else {
            logger.error(`Error calling workers API for event ${eventData.id}: ${error.message}`);
        }
        throw error;
    }
}
