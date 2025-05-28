import { logger } from '../logger';

export class PriceService {
    private readonly apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.ALCHEMY_API_KEY || process.env.PONDER_RPC_URL_1?.split('/').pop() || '';
    }

    async fetchEthHistoricalPrice(startTime: string, endTime: string): Promise<number | null> {
        if (!this.apiKey) {
            logger.warn('No Alchemy API key found');
            return null;
        }

        const url = `https://api.g.alchemy.com/prices/v1/${this.apiKey}/tokens/historical`;
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'ETH', startTime, endTime, interval: '1h' })
        };

        try {
            logger.debug(`Fetching ETH price from Alchemy: ${startTime} - ${endTime}`);
            const response = await fetch(url, options);
            const body = await response.json();
            if (body?.data && body.data.length > 0) {
                return parseFloat(body.data[0].value);
            }
            return null;
        } catch (error) {
            logger.error({ msg: 'Error fetching ETH historical price from Alchemy', error });
            return null;
        }
    }
}
