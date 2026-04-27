const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

console.log(`[Config] Loading .env from: ${envPath}`);
if (!fs.existsSync(envPath)) {
    console.error(`❌ CRITICAL: .env file NOT FOUND at ${envPath}`);
}

// Debug: Check if variables are loading
if (!process.env.DB_NAME) {
    console.warn('⚠️ WARNING: DB_NAME not found in environment variables.');
}

module.exports = {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER,
    DB_PASS: process.env.DB_PASS || '', // Ensure empty string instead of undefined
    DB_NAME: process.env.DB_NAME,
    HEADLESS: process.env.HEADLESS === 'false' ? false : true, // Default to true
    VAHAN_USER: process.env.VAHAN_USER || 'digitalauto',
    VAHAN_PASS: process.env.VAHAN_PASS || 'Rajesthan@2025'
};
