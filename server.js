const app = require("./app");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = 8000;

async function startServer() {
    try {
        await prisma.$connect();
        console.log('Connected to the database successfully');

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1); 
    }
}


process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await prisma.$disconnect();
    console.log('Disconnected from the database');
    process.exit(0);
});

startServer();
