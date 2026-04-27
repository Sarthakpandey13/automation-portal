-- CREATE DATABASE IF NOT EXISTS vahan_db;
-- USE vahan_db;

-- Main vehicles table
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
);

-- Legacy/Summary history table
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
);

-- Specific History Tables
CREATE TABLE IF NOT EXISTS history_of_challans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Serial_No VARCHAR(50), Challan_No VARCHAR(100), Offense_Details TEXT, Challan_Place VARCHAR(255), Challan_Date_Time VARCHAR(100), State VARCHAR(100), RTO VARCHAR(255), Accused_Name VARCHAR(255), Amount DECIMAL(10,2), Challan_Status VARCHAR(100), Payment_Source VARCHAR(100), Payment_Date VARCHAR(100), Receipt_Number VARCHAR(100), sent_to_reg_court VARCHAR(10), remark TEXT, dl_no VARCHAR(100), driver_name VARCHAR(255), owner_name VARCHAR(255), department VARCHAR(255), document_impounded VARCHAR(10), amount_of_fine_imposed DECIMAL(10,2), court_address TEXT, court_name VARCHAR(255), date_of_proceeding VARCHAR(100), sent_to_court_on VARCHAR(100), sent_to_virtual_court VARCHAR(10), rto_distric_name VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_hypothecations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Hypothecation_Type VARCHAR(100), Financer_Name VARCHAR(255), Financer_Address TEXT, From_Date VARCHAR(100), To_Date VARCHAR(100), Termination_Date VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_insurances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Sr_No VARCHAR(50), Insurance_Company VARCHAR(255), Insurance_Type VARCHAR(100), Insurance_From VARCHAR(100), Insurance_Upto VARCHAR(100), Cover_Note_No VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_paid_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Receipt_No VARCHAR(100), Receipt_Date VARCHAR(100), Application_No VARCHAR(100), Fee_Amount DECIMAL(10,2), Fine DECIMAL(10,2), Fee_Particular TEXT, Office VARCHAR(255), GRN_No VARCHAR(100), Fee_Collected_As VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_road_taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Receipt_No VARCHAR(100), Application_No VARCHAR(100), Tax_From VARCHAR(100), Tax_Upto VARCHAR(100), Tax_Type VARCHAR(100), Challan_Date VARCHAR(100), Total_Amount DECIMAL(10,2), Office VARCHAR(255), Tax DECIMAL(10,2), Penalty DECIMAL(10,2), GRN_No VARCHAR(100), Breakup TEXT, Tax_Mode VARCHAR(100), collection_mode VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_transfer_ownerships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Ownership_Serial VARCHAR(50), Owner_From VARCHAR(100), Owner_Upto VARCHAR(100), Owner_Name VARCHAR(255), Father_Husband_Name VARCHAR(255), Present_Address TEXT, Permanent_Address TEXT, Owner_Type VARCHAR(100), Sale_Auction_Date VARCHAR(100), Sale_Amount DECIMAL(15,2), Reason TEXT, Office VARCHAR(255), Deemed_Transfer_Time_Days VARCHAR(50),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_blacklists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Complain_File_Number VARCHAR(100), Complain_Date VARCHAR(100), Complain_Entered_By VARCHAR(255), Action_Taken TEXT, Action_Entered_By VARCHAR(255), Action_Date VARCHAR(100), Office VARCHAR(255), Compounding_Amount DECIMAL(10,2),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_permits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Permit_No VARCHAR(100), Issue_Date VARCHAR(100), Valid_From VARCHAR(100), Valid_Upto VARCHAR(100), Permit_Type VARCHAR(100), Permit_Category VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_tax_clears (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Sr_No VARCHAR(50), Tax_Description TEXT, Tax_Clear_To VARCHAR(100), TCR_No VARCHAR(100), Operation_Date VARCHAR(100), Remarks TEXT, Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_fitness (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Appl_No VARCHAR(100), Fitness_Check_Date VARCHAR(100), Result VARCHAR(100), Fitness_UPTO VARCHAR(100), NID VARCHAR(100), Operation_Date VARCHAR(100), Fitness_Officer_Name1 VARCHAR(255), Fitness_Officer_Name2 VARCHAR(255), Office VARCHAR(255), Remark TEXT,
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_changed_vehicle_record_by_admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Sr_No VARCHAR(50), Changed_By VARCHAR(255), Changed_Data TEXT, Changed_On VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_rc_print_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Purpose VARCHAR(255), Printed_On VARCHAR(100), Printed_By VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_noc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), NOC_No VARCHAR(100), NOC_Date VARCHAR(100), State_To VARCHAR(100), Office_To VARCHAR(255), Dispatch_No VARCHAR(100), New_Owner VARCHAR(255), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_address_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Address_From TEXT, Address_To TEXT, Office VARCHAR(255), Changed_On VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_alterations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Alteration_Type VARCHAR(100), Details TEXT, Office VARCHAR(255), Operation_Date VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_conversions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), From_Class VARCHAR(100), To_Class VARCHAR(100), Office VARCHAR(255), Operation_Date VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_duplicate_rcs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Reason TEXT, Printed_On VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_reassignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Old_Registration_No VARCHAR(50), New_Registration_No VARCHAR(50), Office VARCHAR(255), Operation_Date VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_renewals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), Renewed_Upto VARCHAR(100), Office VARCHAR(255), Operation_Date VARCHAR(100),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_hsrps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), HSRP_Number VARCHAR(100), Fixing_Date VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_slds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Application_No VARCHAR(100), SLD_Number VARCHAR(100), Fitment_Date VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_puccs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    PUCC_No VARCHAR(100), PUCC_Upto VARCHAR(100), Result VARCHAR(50), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_np_authorisations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    Authorisation_No VARCHAR(100), Valid_From VARCHAR(100), Valid_Upto VARCHAR(100), Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history_of_cods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    Registration_No VARCHAR(20),
    COD_No VARCHAR(100), Deposit_Date VARCHAR(100), Reason TEXT, Office VARCHAR(255),
    full_row_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
