import axios from 'axios';
import {EventData} from "../types";

const QUEUE_API_URL = process.env.QUEUE_API_URL;

const httpClient = axios.create({
    baseURL: QUEUE_API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export async function addEventEnrichmentJob(eventData: EventData) {
    if (!QUEUE_API_URL) {
        return;
    }
    try {
        const response = await httpClient.post('/jobs/enrich-event', eventData);

        console.debug(`Successfully enqueued job for event ${eventData.id}: ${response.data.jobId}`);
        return response.data;

    } catch (error: any) {
        if (error.response) {
            console.error(`Workers API error for event ${eventData.id}: ${error.response.status} ${error.response.data}`);
        } else if (error.request) {
            console.error(`Network error calling workers API for event ${eventData.id}: ${error.message}`);
        } else {
            console.error(`Error calling workers API for event ${eventData.id}: ${error.message}`);
        }
        throw error;
    }
}
