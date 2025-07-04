# Jhonks Backend API

A comprehensive backend API for the Jhonks waste management platform, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication**: JWT-based authentication with role-based access control
- **Material Management**: CRUD operations for waste materials with categories
- **Bin Management**: Shopping cart-like functionality for waste collection
- **Agent System**: Agent registration, validation, and management
- **Sales Processing**: Complete sales workflow with payment tracking
- **Bank Details**: Secure bank account management
- **Admin Dashboard**: Comprehensive admin panel with statistics

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/my-Jhonks/node-backend
   cd node-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   - Copy `config.env` and modify the values as needed
   - Ensure MongoDB is running on your system

4. **Start the server**

   ```bash
   # Development mode
   npm start

   # Production mode
   npm start
   ```

## API Documentation inside the doc file in the root dir

## 🗄️ Database Models

### User

- Basic user information
- Role-based access (user, agent, admin)
- Agent-specific details for verified agents

### Material

- Material information with categories
- Pricing per kilogram
- Exemptions and descriptions

### Bin

- User's waste collection cart
- Material quantities and pricing
- Agent selection and validation status

### Sale

- Completed sales transactions
- Payment status and delivery tracking

### Bank

- User's bank account details
- Secure storage for payment processing

### Delivery

- Delivery tracking for validated sales
- Agent assignment and status updates

## 🔐 Authentication & Authorization

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Role-Based Access:

- **User**: Basic operations, bin management, sales
- **Agent**: Validation, delivery management
- **Admin**: Full system access, material management

## 🚀 Running the Application

### Admin froontend

```bash
cd frontend
```

### Production Mode

```bash
npm start
```

### Admin Database testing with dummy data (Seeding )

```bash
npm run seed
```

## 📊 Default Admin Account

After running the seed script, you'll have access to the admin account:

- **Email**: admin@jhonks.com
- **Password**: admin123

## 🔍 Health Check

Check if the API is running:

```bash
curl http://localhost:5000/health
```

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Environment variable configuration

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "status": "fail",
  "message": "Error description"
}
```
