require('dotenv').config();

module.exports = {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASS: process.env.DB_PASS || '',
    DB_NAME: process.env.DB_NAME || 'vahan_db',
    VAHAN_USER: 'digitalauto',
    VAHAN_PASS: 'Rajesthan@2025'
};
