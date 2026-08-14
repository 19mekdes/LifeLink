import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import error handlers
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend directory (sibling of backend/)
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

const app = express();

// ============ MIDDLEWARE ============

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': ["'self'", "'unsafe-inline'"],
      // Allow API calls to localhost:5000 even when the page is served from another port
      'connect-src': ["'self'", 'http://localhost:5000', 'http://127.0.0.1:5000']
    }
  }
}));


app.use(cors({
  origin(origin, callback) {
    // Allow non-browser requests (no Origin header) and any localhost origin/port
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return callback(null, true);
    }
    // Allow an explicitly configured client URL
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============ ROUTES ============
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'LifeLink API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import routes
import authRoutes from './routes/authRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);

// Other routes (to be added later)
// app.use('/api/donors', require('./routes/donorRoutes'));
// app.use('/api/blood-banks', require('./routes/bloodBankRoutes'));
// app.use('/api/blood-requests', require('./routes/bloodRequestRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// ============ STATIC FRONTEND ============
// Serve the frontend over HTTP so ES modules work (they are blocked on file://)
//   /login.html, /register.html, /donor-dashboard.html, ...  -> frontend/public/
//   /src/css/*, /src/js/*                                    -> frontend/src/
app.use(express.static(path.join(FRONTEND_DIR, 'public')));
app.use('/src', express.static(path.join(FRONTEND_DIR, 'src')));

// Root redirects to the login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// ============ ERROR HANDLING ============
// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

export default app;