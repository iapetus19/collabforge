import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
}
});
//  enable app.set('trust proxy', 1) in production when behind reverse proxy

export default limiter;
