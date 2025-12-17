import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import { supabase } from './lib/supabaseClient';
import teamRoutes from './routes/participant/team.routes';
import submissionRoutes from './routes/participant/submission.routes';
import notificationRoutes from './routes/participant/notification.routes';
import dashboardRoutes from './routes/participant/dashboard.routes';
import judgeRoutes from './routes/judge/judge.routes';
import adminRoutes from './routes/admin/admin.routes';
import publicRoutes from './routes/public.routes';
import { startAnnouncementScheduler } from './services/admin/admin.service';

// Initialize environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware Setup
app.use(helmet());

// CORS configuration - allow multiple origins for development
const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In development, allow localhost on ANY port (3000-3010)
        if (process.env.NODE_ENV !== 'production' && origin && origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
        }
        
        // Check against allowed origins list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Allow cookies to be sent
}));
app.use(morgan('dev')); // Logging requests
app.use(express.json()); // Body parser for JSON requests
app.use(cookieParser()); // Cookie parser for JWT access

// Simple Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        message: 'HackOnX API is running!',
        environment: process.env.NODE_ENV,
        port: PORT 
    });
});

app.use('/api/auth', authRoutes);
// Team routes are mounted under plural and singular for compatibility
app.use('/api/teams', teamRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/notifications', notificationRoutes); 
app.use('/api/event', notificationRoutes);
app.use('/api/participant', dashboardRoutes);

// Judge Routes
app.use('/api/judge', judgeRoutes);

// Admin Routes**
app.use('/api/admin', adminRoutes);

app.use('/api/public', publicRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`⚡️ [server]: Server is running at http://localhost:${PORT}`);
    console.log(`Frontend URL for CORS: ${process.env.FRONTEND_URL}`);
    startAnnouncementScheduler();
});