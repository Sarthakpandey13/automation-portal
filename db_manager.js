const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const JSON_DB_PATH = path.join(__dirname, 'db.json');

class DBManager {
    constructor() {
        this.connection = null;
        this.isMySQL = false;
        this.data = { vehicles: [] };
    }

    async init() {
        try {
            this.connection = await mysql.createConnection({
                host: config.DB_HOST,
                user: config.DB_USER,
                password: config.DB_PASS,
                database: config.DB_NAME
            });
            this.isMySQL = true;
            console.log('Connected to MySQL');

            // CREATE TABLES IF NOT EXISTS
            await this.connection.execute(`
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
                    status ENUM('Pending', 'Processing', 'Completed', 'Error', 'No Data') DEFAULT 'Pending',
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            const historyTableSchemas = {
                history_of_challans: [
                    'Serial_No VARCHAR(50)', 'Challan_No VARCHAR(100)', 'Offense_Details TEXT', 'Challan_Place VARCHAR(255)',
                    'Challan_Date_Time VARCHAR(100)', 'State VARCHAR(100)', 'RTO VARCHAR(255)', 'Accused_Name VARCHAR(255)',
                    'Amount DECIMAL(10,2)', 'Challan_Status VARCHAR(100)', 'Payment_Source VARCHAR(100)', 'Payment_Date VARCHAR(100)',
                    'Receipt_Number VARCHAR(100)', 'sent_to_reg_court VARCHAR(10)', 'remark TEXT', 'dl_no VARCHAR(100)',
                    'driver_name VARCHAR(255)', 'owner_name VARCHAR(255)', 'department VARCHAR(255)', 'document_impounded VARCHAR(10)',
                    'amount_of_fine_imposed DECIMAL(10,2)', 'court_address TEXT', 'court_name VARCHAR(255)', 'date_of_proceeding VARCHAR(100)',
                    'sent_to_court_on VARCHAR(100)', 'sent_to_virtual_court VARCHAR(10)', 'rto_distric_name VARCHAR(255)'
                ],
                history_of_hypothecations: [
                    'Application_No VARCHAR(100)', 'Hypothecation_Type VARCHAR(100)', 'Financer_Name VARCHAR(255)',
                    'Financer_Address TEXT', 'From_Date VARCHAR(100)', 'To_Date VARCHAR(100)', 'Termination_Date VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_insurances: [
                    'Sr_No VARCHAR(50)', 'Insurance_Company VARCHAR(255)', 'Insurance_Type VARCHAR(100)', 'Insurance_From VARCHAR(100)',
                    'Insurance_Upto VARCHAR(100)', 'Cover_Note_No VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_paid_fees: [
                    'Receipt_No VARCHAR(100)', 'Receipt_Date VARCHAR(100)', 'Application_No VARCHAR(100)',
                    'Fee_Amount DECIMAL(10,2)', 'Fine DECIMAL(10,2)', 'Fee_Particular TEXT',
                    'Office VARCHAR(255)', 'GRN_No VARCHAR(100)', 'Fee_Collected_As VARCHAR(100)'
                ],
                history_of_road_taxes: [
                    'Receipt_No VARCHAR(100)', 'Application_No VARCHAR(100)', 'Tax_From VARCHAR(100)',
                    'Tax_Upto VARCHAR(100)', 'Tax_Type VARCHAR(100)', 'Challan_Date VARCHAR(100)',
                    'Total_Amount DECIMAL(10,2)', 'Office VARCHAR(255)', 'Tax DECIMAL(10,2)',
                    'Penalty DECIMAL(10,2)', 'GRN_No VARCHAR(100)', 'Breakup TEXT',
                    'Tax_Mode VARCHAR(100)', 'collection_mode VARCHAR(100)'
                ],
                history_of_transfer_ownerships: [
                    'Application_No VARCHAR(100)', 'Ownership_Serial VARCHAR(50)', 'Owner_From VARCHAR(100)', 'Owner_Upto VARCHAR(100)',
                    'Owner_Name VARCHAR(255)', 'Father_Husband_Name VARCHAR(255)', 'Present_Address TEXT', 'Permanent_Address TEXT',
                    'Owner_Type VARCHAR(100)', 'Sale_Auction_Date VARCHAR(100)', 'Sale_Amount DECIMAL(15,2)', 'Reason TEXT',
                    'Office VARCHAR(255)', 'Deemed_Transfer_Time_Days VARCHAR(50)'
                ],
                history_of_blacklists: [
                    'Complain_File_Number VARCHAR(100)', 'Complain_Date VARCHAR(100)', 'Complain_Entered_By VARCHAR(255)',
                    'Action_Taken TEXT', 'Action_Entered_By VARCHAR(255)', 'Action_Date VARCHAR(100)', 'Office VARCHAR(255)', 'Compounding_Amount DECIMAL(10,2)'
                ],
                history_of_permits: [
                    'Application_No VARCHAR(100)', 'Permit_No VARCHAR(100)', 'Issue_Date VARCHAR(100)', 'Valid_From VARCHAR(100)',
                    'Valid_Upto VARCHAR(100)', 'Permit_Type VARCHAR(100)', 'Permit_Category VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_tax_clears: [
                    'Sr_No VARCHAR(50)', 'Tax_Description TEXT', 'Tax_Clear_To VARCHAR(100)', 'TCR_No VARCHAR(100)',
                    'Operation_Date VARCHAR(100)', 'Remarks TEXT', 'Office VARCHAR(255)'
                ],
                history_of_fitness: [
                    'Appl_No VARCHAR(100)', 'Fitness_Check_Date VARCHAR(100)', 'Result VARCHAR(100)', 'Fitness_UPTO VARCHAR(100)',
                    'NID VARCHAR(100)', 'Operation_Date VARCHAR(100)', 'Fitness_Officer_Name1 VARCHAR(255)', 'Fitness_Officer_Name2 VARCHAR(255)',
                    'Office VARCHAR(255)', 'Remark TEXT'
                ],
                history_of_changed_vehicle_record_by_admins: [
                    'Sr_No VARCHAR(50)', 'Changed_By VARCHAR(255)', 'Changed_Data TEXT', 'Changed_On VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_rc_print_details: [
                    'Application_No VARCHAR(100)', 'Purpose VARCHAR(255)', 'Printed_On VARCHAR(100)', 'Printed_By VARCHAR(255)'
                ],
                history_of_noc: [
                    'Application_No VARCHAR(100)', 'NOC_No VARCHAR(100)', 'NOC_Date VARCHAR(100)', 'State_To VARCHAR(100)',
                    'Office_To VARCHAR(255)', 'Dispatch_No VARCHAR(100)', 'New_Owner VARCHAR(255)', 'Office VARCHAR(255)'
                ],
                history_of_address_changes: [
                    'Application_No VARCHAR(100)', 'Address_From TEXT', 'Address_To TEXT', 'Office VARCHAR(255)', 'Changed_On VARCHAR(100)'
                ],
                history_of_alterations: [
                    'Application_No VARCHAR(100)', 'Alteration_Type VARCHAR(100)', 'Details TEXT', 'Office VARCHAR(255)', 'Operation_Date VARCHAR(100)'
                ],
                history_of_conversions: [
                    'Application_No VARCHAR(100)', 'From_Class VARCHAR(100)', 'To_Class VARCHAR(100)', 'Office VARCHAR(255)', 'Operation_Date VARCHAR(100)'
                ],
                history_of_duplicate_rcs: [
                    'Application_No VARCHAR(100)', 'Reason TEXT', 'Printed_On VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_reassignments: [
                    'Application_No VARCHAR(100)', 'Old_Registration_No VARCHAR(50)', 'New_Registration_No VARCHAR(50)', 'Office VARCHAR(255)', 'Operation_Date VARCHAR(100)'
                ],
                history_of_renewals: [
                    'Application_No VARCHAR(100)', 'Renewed_Upto VARCHAR(100)', 'Office VARCHAR(255)', 'Operation_Date VARCHAR(100)'
                ],
                history_of_hsrps: [
                    'Application_No VARCHAR(100)', 'HSRP_Number VARCHAR(100)', 'Fixing_Date VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_slds: [
                    'Application_No VARCHAR(100)', 'SLD_Number VARCHAR(100)', 'Fitment_Date VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_puccs: [
                    'PUCC_No VARCHAR(100)', 'PUCC_Upto VARCHAR(100)', 'Result VARCHAR(50)', 'Office VARCHAR(255)'
                ],
                history_of_np_authorisations: [
                    'Authorisation_No VARCHAR(100)', 'Valid_From VARCHAR(100)', 'Valid_Upto VARCHAR(100)', 'Office VARCHAR(255)'
                ],
                history_of_cods: [
                    'COD_No VARCHAR(100)', 'Deposit_Date VARCHAR(100)', 'Reason TEXT', 'Office VARCHAR(255)'
                ]
            };

            for (const [table, columns] of Object.entries(historyTableSchemas)) {
                const columnDefs = columns.join(', ');
                await this.connection.execute(`
                    CREATE TABLE IF NOT EXISTS ${table} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        Registration_No VARCHAR(20),
                        ${columnDefs},
                        full_row_json LONGTEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                `);
            }

            // Legacy support
            await this.connection.execute(`
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
        } catch (err) {
            console.warn('MySQL Connection failed, falling back to JSON storage:', err.message);
            this.isMySQL = false;
            this.loadJSON();
        }
    }

    loadJSON() {
        if (fs.existsSync(JSON_DB_PATH)) {
            this.data = JSON.parse(fs.readFileSync(JSON_DB_PATH, 'utf8'));
        } else {
            this.data = { vehicles: [] };
            this.saveJSON();
        }
    }

    saveJSON() {
        fs.writeFileSync(JSON_DB_PATH, JSON.stringify(this.data, null, 2));
    }

    async getVehicles() {
        if (this.isMySQL) {
            const [rows] = await this.connection.execute('SELECT * FROM vehicles ORDER BY id DESC');
            return rows;
        }
        return this.data.vehicles.sort((a, b) => b.id - a.id);
    }

    async addVehicle(vehicle_no) {
        if (this.isMySQL) {
            await this.connection.execute('INSERT INTO vehicles (vehicle_no) VALUES (?)', [vehicle_no]);
        } else {
            const id = this.data.vehicles.length + 1;
            this.data.vehicles.push({
                id,
                vehicle_no,
                status: 'Pending',
                owner_name: null,
                insurance_upto: null,
                full_data: null
            });
            this.saveJSON();
        }
    }

    async getVehicleById(id) {
        if (this.isMySQL) {
            const [rows] = await this.connection.execute('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
            return rows[0];
        }
        return this.data.vehicles.find(v => v.id === Number(id));
    }

    async getAllVehicles() {
        const [rows] = await this.connection.execute('SELECT * FROM vehicles ORDER BY id ASC');
        return rows;
    }

    async getPendingVehicle() {
        if (this.isMySQL) {
            const [rows] = await this.connection.execute('SELECT * FROM vehicles WHERE status = "Pending" LIMIT 1');
            return rows[0];
        }
        return this.data.vehicles.find(v => v.status === 'Pending');
    }

    async ensureColumnExists(tableName, columnName) {
        if (!this.isMySQL) return;
        try {
            const [columns] = await this.connection.execute(`SHOW COLUMNS FROM \`${tableName}\` WHERE Field = ?`, [columnName]);
            if (columns.length === 0) {
                console.log(`[DB] Adding missing column: ${columnName} to table ${tableName}`);
                await this.connection.execute(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` TEXT`);
            }
        } catch (e) {
            console.error(`[DB] Error ensuring column ${columnName} exists in ${tableName}:`, e.message);
        }
    }

    async updateVehicle(id, data) {
        if (this.isMySQL) {
            // First ensure all columns exist
            for (const key of Object.keys(data)) {
                if (key === 'id') continue;
                await this.ensureColumnExists('vehicles', key);
            }

            const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
            const values = [...Object.values(data), id];
            await this.connection.execute(`UPDATE vehicles SET ${fields} WHERE id = ?`, values);
        } else {
            const index = this.data.vehicles.findIndex(v => v.id === id);
            if (index !== -1) {
                this.data.vehicles[index] = { ...this.data.vehicles[index], ...data };
                this.saveJSON();
            }
        }
    }

    titleToTableName(title) {
        if (!title) return null;
        const t = title.toLowerCase().trim();
        if (t.includes('challan')) return 'history_of_challans';
        if (t.includes('hypothecation')) return 'history_of_hypothecations';
        if (t.includes('insurance')) return 'history_of_insurances';
        if (t.includes('paid fees') || (t.includes('paid') && t.includes('fees'))) return 'history_of_paid_fees';
        if (t.includes('road tax')) return 'history_of_road_taxes';
        if (t.includes('ownership')) return 'history_of_transfer_ownerships';
        if (t.includes('blacklist')) return 'history_of_blacklists';
        if (t.includes('permit')) return 'history_of_permits';
        if (t.includes('tax clear')) return 'history_of_tax_clears';
        if (t.includes('fitness')) return 'history_of_fitness';
        if (t.includes('changed vehicle')) return 'history_of_changed_vehicle_record_by_admins';
        if (t.includes('rc print')) return 'history_of_rc_print_details';
        if (t.includes('noc')) return 'history_of_noc';

        return title.replace(/\s+/g, '_').toLowerCase();
    }

    async saveHistoryRecord(vehicleId, type, record) {
        if (!this.isMySQL) return;

        const vehicle = await this.getVehicleById(vehicleId);
        const registrationNo = vehicle ? vehicle.vehicle_no : null;
        const tableName = this.titleToTableName(type);

        // 1. Save to specific history table with dynamic column mapping
        if (tableName) {
            try {
                // Get all columns for this table from the schema we defined
                // For simplicity, we'll extract them from the table itself or just use a clever mapper
                const [columns] = await this.connection.execute(`DESCRIBE ${tableName}`);
                const tableCols = columns.map(c => c.Field).filter(f => !['id', 'Registration_No', 'full_row_json', 'created_at', 'updated_at'].includes(f));

                const insertData = { Registration_No: registrationNo };

                // Map record keys to table columns
                for (const [key, val] of Object.entries(record)) {
                    if (!key) continue;
                    
                    // Normalize column names: remove special chars, replace with _, trim underscores
                    const normalizedCol = key.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                    if (!normalizedCol) continue;

                    await this.ensureColumnExists(tableName, normalizedCol);
                    insertData[normalizedCol] = val;
                }

                const colNames = Object.keys(insertData);
                const colValues = Object.values(insertData);
                const placeholders = colNames.map(() => '?').join(', ');
                const escapedColNames = colNames.map(c => `\`${c}\``).join(', ');

                await this.connection.execute(
                    `INSERT INTO \`${tableName}\` (${escapedColNames}, full_row_json) VALUES (${placeholders}, ?)`,
                    [...colValues, JSON.stringify(record)]
                );
            } catch (e) {
                console.warn(`Could not save to ${tableName}:`, e.message);
            }
        }

        // 2. Save to legacy vehicle_history table
        const receiptNo = record["Receipt No"] || record["Receipt No."] || record["Challan No"] || record["column_1"] || null;
        const receiptDate = record["Receipt Date"] || record["Challan Date/Time"] || record["column_2"] || null;
        const appNo = record["Application No."] || record["Application No"] || record["column_3"] || null;

        let amount = 0;
        const amountStr = record["Amount"] || record["Fee Amount"] || record["Total Amount"] || record["column_7"] || "0";
        amount = parseFloat(String(amountStr).replace(/[^0-9.]/g, '')) || 0;

        const status = record["Challan Status"] || record["Status"] || null;
        const office = record["Office"] || record["RTO"] || record["column_8"] || null;

        await this.connection.execute(
            'INSERT INTO vehicle_history (vehicle_id, history_type, receipt_no, receipt_date, application_no, amount, status, office, full_row_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [vehicleId, type, receiptNo, receiptDate, appNo, amount, status, office, JSON.stringify(record)]
        );
    }

    async clearAllData() {
        if (this.isMySQL) {
            console.log('[DB] Clearing all data from MySQL...');
            // Disable foreign key checks to truncate everything
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');
            
            // Get all history tables
            const historyTables = [
                'history_of_challans', 'history_of_hypothecations', 'history_of_insurances',
                'history_of_paid_fees', 'history_of_road_taxes', 'history_of_transfer_ownerships',
                'history_of_blacklists', 'history_of_permits', 'history_of_tax_clears',
                'history_of_fitness', 'history_of_changed_vehicle_record_by_admins',
                'history_of_rc_print_details', 'history_of_noc', 'history_of_address_changes',
                'history_of_alterations', 'history_of_conversions', 'history_of_duplicate_rcs',
                'history_of_reassignments', 'history_of_renewals', 'history_of_hsrps',
                'history_of_slds', 'history_of_puccs', 'history_of_np_authorisations',
                'history_of_cods', 'vehicle_history', 'vehicles'
            ];

            for (const table of historyTables) {
                try {
                    await this.connection.execute(`TRUNCATE TABLE ${table}`);
                } catch (e) {
                    console.warn(`[DB] Could not truncate ${table}: ${e.message}`);
                }
            }
            
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        } else {
            this.data = { vehicles: [] };
            this.saveJSON();
        }
    }
}

module.exports = new DBManager();
