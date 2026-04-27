const mysql = require('mysql2/promise');
const config = require('./config');

async function checkAndCreateDB() {
    try {
        const connection = await mysql.createConnection({
            host: config.DB_HOST,
            user: config.DB_USER,
            password: config.DB_PASS
        });
        console.log('Connected to MySQL server');
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\``);
        console.log(`Database ${config.DB_NAME} checked/created`);
        
        await connection.query(`USE \`${config.DB_NAME}\``);
        await connection.query(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_no VARCHAR(20) UNIQUE NOT NULL,
                owner_name VARCHAR(255),
                registration_date VARCHAR(50),
                chassis_no VARCHAR(100),
                engine_no VARCHAR(100),
                vehicle_class VARCHAR(100),
                fuel_type VARCHAR(50),
                fitness_upto VARCHAR(50),
                insurance_upto VARCHAR(50),
                pucc_upto VARCHAR(50),
                mv_tax_upto VARCHAR(50),
                maker_model VARCHAR(255),
                full_data LONGTEXT,
                status VARCHAR(50) DEFAULT 'Pending',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table vehicles checked/created');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS vehicle_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_id INT,
                history_type VARCHAR(255),
                receipt_no VARCHAR(100),
                receipt_date VARCHAR(100),
                application_no VARCHAR(100),
                amount DECIMAL(10,2),
                status VARCHAR(100),
                office VARCHAR(255),
                full_row_json LONGTEXT,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            )
        `);
        console.log('Table vehicle_history checked/created');
        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAndCreateDB();
