const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./utils/logger');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security Middleware (Helmet CSP and headers)
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com"],
      connectSrc: ["'self'", "https://res.cloudinary.com", process.env.FRONTEND_URL],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Global Cache-Control for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.startsWith('/api/public')) {
      // Basic cache for public API responses (1 minute) to reduce load during spikes
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    } else if (
      req.path.startsWith('/api/dishes') || 
      req.path.startsWith('/api/admin') || 
      req.path.startsWith('/api/dashboard') ||
      req.path.startsWith('/api/auth')
    ) {
      // Prevent stale data and caching for CRUD, admin, dashboard, and auth
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    } else {
      // Default fallback (no aggressive caching to be safe)
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
  next();
});

// CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL, 
  'http://localhost:5173', 
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(compression());

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected to socket:', socket.id);

  socket.on('join_restaurant', (restaurantId) => {
    socket.join(`restaurant_${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant_${restaurantId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiter to all API routes
app.use('/api', limiter);

// Create upload directories if they don't exist
const dirs = ['uploads/dishes', 'uploads/logos', 'uploads/banners'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Basic route
app.get('/', (req, res) => {
  res.send('RASTRO-menu API is running');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const dishRoutes = require('./routes/dishRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/suggestions', suggestionRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Server Error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY is not set. Password reset emails may fail.');
  }

  // Auto-migrate: ensure ar_model_library has normalized columns
  try {
    const pool = require('./config/db');
    const [cols] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'ar_model_library'
        AND COLUMN_NAME IN ('normalized_rotation_x','normalized_rotation_y','normalized_rotation_z','normalized_scale','normalized_height_offset')
    `);
    const existingCols = cols.map(c => c.COLUMN_NAME);
    const toAdd = [
      { name: 'normalized_rotation_x',    def: 'DECIMAL(10,4) DEFAULT 0.0000' },
      { name: 'normalized_rotation_y',    def: 'DECIMAL(10,4) DEFAULT 0.0000' },
      { name: 'normalized_rotation_z',    def: 'DECIMAL(10,4) DEFAULT 0.0000' },
      { name: 'normalized_scale',          def: 'DECIMAL(10,4) DEFAULT 1.0000' },
      { name: 'normalized_height_offset',  def: 'DECIMAL(10,4) DEFAULT 0.0000' },
    ].filter(c => !existingCols.includes(c.name));

    for (const col of toAdd) {
      await pool.query(`ALTER TABLE ar_model_library ADD COLUMN ${col.name} ${col.def}`);
      logger.info(`[migration] Added column ar_model_library.${col.name}`);
    }
    if (toAdd.length === 0) {
      logger.info('[migration] ar_model_library schema is up to date.');
    }
  } catch (migErr) {
    logger.warn(`[migration] Could not verify/migrate ar_model_library columns: ${migErr.message}`);
  }

  // Auto-migrate: ensure dishes table has missing AI/AR columns
  try {
    const pool = require('./config/db');
    const [dishCols] = await pool.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'dishes'
        AND COLUMN_NAME IN ('ai_description', 'taste_tags', 'ai_category', 'ai_enhanced_image', 'ar_enabled', 'ar_image_url')
    `);
    const existingDishCols = dishCols.map(c => c.COLUMN_NAME);
    const dishColsToAdd = [
      { name: 'ai_description', def: 'TEXT NULL' },
      { name: 'taste_tags', def: 'TEXT NULL' },
      { name: 'ai_category', def: 'VARCHAR(100) NULL' },
      { name: 'ai_enhanced_image', def: 'VARCHAR(255) NULL' },
      { name: 'ar_enabled', def: 'BOOLEAN DEFAULT FALSE' },
      { name: 'ar_image_url', def: 'VARCHAR(255) NULL' },
    ].filter(c => !existingDishCols.includes(c.name));

    for (const col of dishColsToAdd) {
      await pool.query(`ALTER TABLE dishes ADD COLUMN ${col.name} ${col.def}`);
      logger.info(`[migration] Added column dishes.${col.name}`);
    }
    if (dishColsToAdd.length === 0) {
      logger.info('[migration] dishes schema is up to date.');
    }
  } catch (migErr) {
    logger.warn(`[migration] Could not verify/migrate dishes columns: ${migErr.message}`);
  }

  // Prevent hanging requests
  server.setTimeout(30000); // 30 seconds
});

