const db = require('./db_manager');

/**
 * Normalizes object keys from "Space Case" or "camelCase" to Pascal_Case (e.g. Serial_No, Insurance_Company)
 */
function normalizeRowKeys(row) {
    if (!row || typeof row !== "object") return row;
    if (Array.isArray(row)) return row.map(normalizeRowKeys);
    const out = {};
    for (const [key, value] of Object.entries(row)) {
        const normalized = String(key)
            .trim()
            .replace(/\s+/g, "_")
            .split("_")
            .map((s) => s.charAt(0).toUpperCase() + (s.slice(1) || "").toLowerCase())
            .join("_");
        out[normalized] = value != null && typeof value === "object" && !Array.isArray(value) ? normalizeRowKeys(value) : value;
    }
    return out;
}

/**
 * Helper to get value from body by trying different key formats
 */
function getFromBody(body, keys) {
    for (const k of keys) {
        if (body[k] !== undefined && body[k] !== null) return body[k];
    }
    return undefined;
}

const JSON_SECTION_KEYS = [
    ["history_of_challans", "history of challans", "historyOfChallan", "challan_history"],
    ["history_of_hypothecations", "history of hypothecations", "historyOfHypothecation", "hypothecation_history"],
    ["history_of_insurances", "history of insurances", "historyOfInsurance", "insurance_history"],
    ["history_of_paid_fees", "history of paid fees", "historyOfPaidFees", "paid_fees_history"],
    ["history_of_road_taxes", "history of road taxes", "historyOfRoadTax", "road_tax_history"],
    ["history_of_transfer_ownerships", "history of transfer ownerships", "historyOfOwnership", "ownership_history"],
    ["history_of_blacklists", "history of blacklists", "historyOfBlacklist", "blacklist_history"],
    ["history_of_permits", "history of permits", "historyOfPermit", "permit_history"],
    ["history_of_tax_clears", "history of tax clears", "historyOfTaxClear", "tax_clear_history"],
    ["history_of_fitness", "history of fitness", "historyOfFitness", "fitness_history"],
    ["history_of_changed_vehicle_record_by_admins", "history of changed vehicle record by admins", "historyOfChangedVehicle", "changed_vehicle_history"],
    ["history_of_rc_print_details", "history of rc print details", "historyOfRcPrint", "rc_print_history"],
    ["history_of_noc", "history of noc", "historyOfNoc", "noc_history"],
];

/**
 * Parses the incoming JSON and saves it to the database
 */
async function processJsonToDb(body) {
    const registrationNo = body.registrationNo ?? body.registration_no ?? body["registration no"] ?? body["Registration No"] ?? body["Vehicle No"];

    if (!registrationNo || String(registrationNo).trim() === "") {
        throw new Error("JSON must include 'registration no' or 'vehicle no'");
    }

    const regNo = String(registrationNo).trim().toUpperCase();

    // 1. Get or Add vehicle
    let vehicle = await db.getVehicles().then(list => list.find(v => v.vehicle_no === regNo));
    if (!vehicle) {
        await db.addVehicle(regNo);
        vehicle = await db.getVehicles().then(list => list.find(v => v.vehicle_no === regNo));
    }

    const vehicleId = vehicle.id;
    const results = {
        vehicle_no: regNo,
        sections: {}
    };

    const toArray = (v) => (Array.isArray(v) ? v : v != null && typeof v === "object" ? [v] : []);

    // 2. Process each section
    for (const keys of JSON_SECTION_KEYS) {
        const primaryKey = keys[2]; // camelCase one for internal reference
        const raw = getFromBody(body, keys);
        if (raw) {
            const list = toArray(raw);
            results.sections[primaryKey] = list.length;
            for (const row of list) {
                const normalizedRow = normalizeRowKeys(row);
                await db.saveHistoryRecord(vehicleId, primaryKey, normalizedRow);
            }
        }
    }

    // 3. Update main vehicle data if provided (owner, etc)
    const ownerName = body.owner_name ?? body.ownerName ?? body["Owner Name"];
    if (ownerName) {
        await db.updateVehicle(vehicleId, { owner_name: ownerName });
    }

    // Update full_data blob
    await db.updateVehicle(vehicleId, { 
        full_data: JSON.stringify(body),
        status: 'Completed'
    });

    return results;
}

module.exports = {
    processJsonToDb,
    normalizeRowKeys
};
