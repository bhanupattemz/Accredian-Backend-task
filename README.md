# **Refer & Earn Backend**

This is the backend service for the **Refer & Earn** application built with modern JavaScript technologies. The system manages user referrals, verification processes, and automated email notifications to create a complete referral marketing solution.

## **Tech Stack**

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web framework for RESTful API development
- **Prisma ORM**: Next-generation ORM for database operations 
- **MySQL**: Relational database for data persistence
- **Nodemailer**: Email service integration for notifications
- **JWT**: JSON Web Tokens for secure authentication
- **Frontend**: Compatible with TailwindCSS or Material-UI frameworks

## **Project Structure**

```
backend/
│
├── .env                    # Environment variables
├── .gitignore              # Git ignore file
├── app.js                  # Express application setup
├── server.js               # Server entry point
├── package.json            # Project dependencies
├── package-lock.json       # Locked dependencies
├── README.md               # Project documentation
│
├── Controller/             # Request handlers
│   ├── ReferController.js  # Referral management logic
│   └── VerifyController.js # Verification process logic
│
├── prisma/                 # Prisma ORM configuration
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
│       └── 20250226061734_init
│           ├── migration.sql
│           └── migration_lock.toml
│
├── Routers/                # API route definitions
│   ├── ReferRouter.js      # Referral endpoints
│   └── VerifyRouter.js     # Verification endpoints
│
└── Utils/                  # Utility functions
    ├── ExpressError.js     # Error handling
    ├── middleware.js       # Express middleware
    ├── sendMail.js         # Email notification service
    └── WrapAsync.js        # Async error wrapper
```

## **Installation**

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory with the following variables:
   ```
   # Database
   DATABASE_URL="mysql://username:password@localhost:3306/refer_earn_db"
   
   # Application
   TZ='UTC'
   FRONTEND_URL="http://localhost:3000"
   NODE_NO_WARNINGS=1
   
   # Email Service
   MAIL="your-email@example.com"
   MAIL_PASSWORD="your-app-password"
   
   # Security (optional)
   JWT_SECRET="your-secret-key"
   ```

## **Database Setup (Prisma)**

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Run Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Seed Database (Optional):**
   ```bash
   npx prisma db seed
   ```

4. **Open Prisma Studio (Database GUI):**
   ```bash
   npx prisma studio
   ```

## **Development**

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Development mode with auto-reload:**
   ```bash
   npm run dev
   ```

## **Prisma Commands**

- **Generate client after schema changes:**
  ```bash
  npx prisma generate
  ```

- **Create and apply new migration:**
  ```bash
  npx prisma migrate dev --name <migration_name>
  ```

- **Reset database (caution - destroys data):**
  ```bash
  npx prisma migrate reset
  ```

## **API Endpoints**

### Referral Management

- **Create Referral**
  - `POST /api/refer`
  - Description: Generate a new referral link for a user
  - Request Body:
    ```json
    {
      "email": "referrer@example.com",
      "name": "John Doe"
    }
    ```
  - Response: Referral code and status

### Verification

- **Verify Referred User**
  - `POST /api/verify`
  - Description: Verify a user who was referred through a referral link
  - Request Body:
    ```json
    {
      "referralCode": "ABC123",
      "email": "referred@example.com",
      "name": "Jane Smith"
    }
    ```
  - Response: Verification status and rewards info

## **Deployment**

The backend can be deployed on cloud platforms like Render, Heroku, or AWS:

1. **Render Deployment:**
   - Create a new Web Service
   - Connect to your GitHub repository
   - Configure environment variables
   - Set build command: `npm install && npx prisma generate`
   - Set start command: `npm start`

2. **Database:**
   - Use a managed MySQL service like PlanetScale, AWS RDS, or Railway
   - Update the `DATABASE_URL` environment variable accordingly

## **Contributing**

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## **License**

This project is licensed under the MIT License - see the LICENSE file for details.