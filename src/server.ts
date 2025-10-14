import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { config } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import borrowingRoutes from './routes/borrowingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import libgenRoutes from './routes/libgenRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';

import './services/notificationScheduler.js';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:3000", `http://localhost:${config.PORT}`, "data:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"], // unsafe-inline needed for React/Tailwind
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000' || `http://localhost:${config.PORT}`,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Trop de requêtes, veuillez réessayer plus tard.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Serveur BiblioDz opérationnel',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/borrowings', borrowingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/libgen', libgenRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/favorites', favoriteRoutes);

// Serve static files (uploads) with CORS headers
app.use('/uploads', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000' || `http://localhost:${config.PORT}`,
  credentials: false,
  methods: ['GET']
}), express.static('uploads'));

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Start server
    const server = app.listen(config.PORT, () => {
      console.log(`🚀 Serveur BiblioDz démarré sur le port ${config.PORT}`);
      console.log(`📚 Environnement: ${config.NODE_ENV}`);
      console.log(`🔗 URL: http://localhost:${config.PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM reçu, arrêt du serveur...');
      server.close(() => {
        console.log('Serveur fermé');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT reçu, arrêt du serveur...');
      server.close(() => {
        console.log('Serveur fermé');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();
