import {generateNonce, SiweErrorType, SiweMessage} from 'siwe';
import {Context} from 'hono';
import {logger} from '@/logger';

export interface SiweSession {
    nonce?: string;
    siwe?: any;
}

export function handleNonce(c: Context) {
    const session = getSession(c);
    session.nonce = generateNonce();

    logger.debug(`Generated nonce: ${session.nonce}`);

    c.header('Content-Type', 'text/plain');
    return c.text(session.nonce);
}

export async function handleVerify(c: Context) {
    try {
        const body = await c.req.json();

        if (!body.message) {
            return c.json({
                error: 'Expected message object in request body'
            }, 422);
        }

        const session = getSession(c);
        if (!session.nonce) {
            return c.json({
                error: 'No nonce found in session'
            }, 400);
        }

        const SIWEObject = new SiweMessage(body.message);
        const {data: message} = await SIWEObject.verify({
            signature: body.signature,
            nonce: session.nonce
        });

        session.siwe = message;

        logger.info(`User authenticated: ${message.address}`);

        return c.json({
            success: true,
            address: message.address
        });

    } catch (error: any) {
        logger.error('Verification failed:', error);

        const session = getSession(c);
        session.siwe = null;
        session.nonce = undefined;

        switch (error.type) {
            case SiweErrorType.EXPIRED_MESSAGE:
                return c.json({
                    success: false,
                    error: 'Message has expired'
                }, 401);
            case SiweErrorType.INVALID_SIGNATURE:
                return c.json({
                    error: 'Invalid signature'
                }, 422);
            default:
                return c.json({
                    error: 'Authentication failed'
                }, 500);
        }
    }
}

export function handleAuthStatus(c: Context) {
    const session = getSession(c);

    if (!session.siwe) {
        return c.json({
            authenticated: false
        }, 401);
    }

    return c.json({
        authenticated: true,
        address: session.siwe.address,
        domain: session.siwe.domain
    });
}

export function handleLogout(c: Context) {
    const session = getSession(c);
    session.siwe = null;
    session.nonce = undefined;

    return c.json({success: true});
}

export function requireAuth(c: Context, next: () => Promise<void>) {
    const session = getSession(c);

    if (!session.siwe) {
        return c.json({
            error: 'Authentication required'
        }, 401);
    }

    c.set('user', session.siwe);
    return next();
}

const sessions = new Map<string, SiweSession>();

function getSession(c: Context): SiweSession {
    const sessionId = c.req.header('X-Session-ID') || 'default';

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {});
    }

    return sessions.get(sessionId)!;
}

export function getSessionById(sessionId: string): SiweSession | null {
    return sessions.get(sessionId) || null;
}
