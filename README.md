# BiblioDz Server (Backend)

A comprehensive digital library management system backend built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

### 📚 Core Library Management
- **Book Management**: CRUD operations for books with metadata
- **Category System**: Hierarchical categories and subcategories
- **User Management**: Authentication and role-based access control
- **File Handling**: PDF/EPUB upload and storage management

### 🔍 LibGen Integration
- **Search Integration**: Search across multiple LibGen mirrors
- **Mirror Management**: Dynamic mirror configuration and health monitoring
- **Automated Import**: Import books directly from LibGen with metadata
- **Download Fallback**: Multiple download sources with automatic fallback

### 🔐 Authentication & Security
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Staff and admin role management
- **Password Security**: Bcrypt hashing and validation
- **CORS Protection**: Cross-origin request security

### 📊 Advanced Features
- **Real-time Updates**: WebSocket support for live status updates
- **File Processing**: Automatic PDF/EPUB processing and validation
- **Search Optimization**: Full-text search with MongoDB indexing
- **API Documentation**: Comprehensive REST API endpoints

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Validation**: Express Validator
- **Security**: Helmet, CORS, bcryptjs
- **Development**: Nodemon, ts-node

## 📋 Prerequisites

- Node.js 18.0 or higher
- MongoDB 5.0 or higher
- npm or yarn package manager

## ⚡ Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/blizzardsflame/SC-DOC-APP-backend.git
cd SC-DOC-APP-backend

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/bibliodz

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000

# LibGen Configuration
LIBGEN_TIMEOUT=30000
LIBGEN_MAX_RETRIES=3

# CORS Configuration
CLIENT_URL=http://localhost:3000
```

### 3. Database Setup

```bash
# Start MongoDB service
# On Windows with MongoDB installed:
net start MongoDB

# On macOS with Homebrew:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
```

### 4. Run the Application

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run type-check
```

## 📁 Project Structure

```
server/
├── src/
│   ├── controllers/          # Route controllers
│   │   ├── authController.ts
│   │   ├── bookController.ts
│   │   ├── categoryController.ts
│   │   ├── libgenController.ts
│   │   └── libgenLinksController.ts
│   ├── middleware/           # Custom middleware
│   │   ├── auth.ts
│   │   ├── upload.ts
│   │   └── validation.ts
│   ├── models/              # Mongoose models
│   │   ├── Book.ts
│   │   ├── Category.ts
│   │   ├── User.ts
│   │   └── LibGenLink.ts
│   ├── routes/              # API routes
│   │   ├── auth.ts
│   │   ├── books.ts
│   │   ├── categories.ts
│   │   ├── libgen.ts
│   │   └── libgen-links.ts
│   ├── services/            # Business logic
│   │   ├── libgenService.ts
│   │   ├── bookService.ts
│   │   └── fileService.ts
│   ├── types/               # TypeScript definitions
│   │   ├── auth.ts
│   │   ├── api.ts
│   │   └── libgen.ts
│   ├── utils/               # Utility functions
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── app.ts               # Express app configuration
├── uploads/                 # File storage directory
├── .env                     # Environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Books
- `GET /api/books` - List all books (with pagination)
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Create new book (Staff only)
- `PUT /api/books/:id` - Update book (Staff only)
- `DELETE /api/books/:id` - Delete book (Staff only)
- `POST /api/books/upload` - Upload book file (Staff only)

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category details
- `POST /api/categories` - Create category (Staff only)
- `PUT /api/categories/:id` - Update category (Staff only)
- `DELETE /api/categories/:id` - Delete category (Staff only)

### LibGen Integration
- `POST /api/libgen/search` - Search LibGen mirrors
- `GET /api/libgen/search/:searchId/status` - Get search status
- `POST /api/libgen/import` - Import book from LibGen
- `POST /api/libgen/download-urls` - Get direct download URLs

### LibGen Mirrors
- `GET /api/libgen-links` - List configured mirrors
- `POST /api/libgen-links` - Add new mirror (Staff only)
- `PUT /api/libgen-links/:id` - Update mirror (Staff only)
- `DELETE /api/libgen-links/:id` - Delete mirror (Staff only)

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `UPLOAD_PATH` | File upload directory | `./uploads` |
| `MAX_FILE_SIZE` | Max file upload size (bytes) | `50000000` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:3000` |

### LibGen Mirror Configuration

LibGen mirrors are managed through the `/api/libgen-links` endpoints. Each mirror has:

- **Name**: Display name for the mirror
- **URL**: Base URL of the mirror
- **Type**: `search` or `download`
- **Priority**: Lower numbers = higher priority
- **Status**: Active/inactive state

## 🧪 Development

### Scripts

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (if configured)
npm test
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting (if configured)
- **Naming**: camelCase for variables, PascalCase for classes

## 🚀 Deployment

### Production Build

```bash
# Build the application
npm run build

# Set production environment
export NODE_ENV=production

# Start the server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production MongoDB URI
3. Set secure JWT secret
4. Configure file storage path
5. Set up reverse proxy (nginx recommended)

## 🔒 Security Considerations

- **JWT Secrets**: Use strong, unique secrets in production
- **Database**: Enable MongoDB authentication
- **File Uploads**: Validate file types and sizes
- **CORS**: Configure appropriate origins
- **Rate Limiting**: Implement API rate limiting
- **HTTPS**: Use HTTPS in production

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints

## 🔄 Changelog

### v1.0.0
- Initial release
- Basic library management
- LibGen integration
- User authentication
- File upload system
