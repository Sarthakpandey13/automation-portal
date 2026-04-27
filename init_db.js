const mysql = require('mysql2/promise');
const config = require('./config');

async function checkAndCreateDB() {
    try {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

        const connection = await mysql.createConnection({
            host: config.DB_HOST,
            user: config.DB_USER,
            password: config.DB_PASS,
            multipleStatements: true
        });
        console.log('Connected to MySQL server');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\``);
        console.log(`Database ${config.DB_NAME} checked/created`);
        
        await connection.query(`USE \`${config.DB_NAME}\``);
        
        // Filter out the commented out database creation lines from schema.sql
        const cleanSql = sql.split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        await connection.query(cleanSql);
        console.log('All tables from schema.sql checked/created');
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAndCreateDB();
