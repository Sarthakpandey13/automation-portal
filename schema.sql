CREATE DATABASE IF NOT EXISTS vahan_db;
USE vahan_db;

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
);
