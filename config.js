require('dotenv').config();

// Debug: Check if variables are loading (hidden in production usually, but helpful now)
if (!process.env.DB_NAME) {
    console.warn('⚠️ WARNING: DB_NAME not found in environment variables. Check your .env file.');
}

module.exports = {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER,
    DB_PASS: process.env.DB_PASS || '', // Ensure empty string instead of undefined
    DB_NAME: process.env.DB_NAME,
    VAHAN_USER: process.env.VAHAN_USER || 'digitalauto',
    VAHAN_PASS: process.env.VAHAN_PASS || 'Rajesthan@2025'
};
