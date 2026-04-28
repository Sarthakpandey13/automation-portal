const express = require('express');
const db = require('./db_manager');
const { spawn } = require('child_process');
const path = require('path');
const { auditScrapedData } = require('./ai_data_check');
const { processJsonToDb } = require('./json_parser');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

let automationProcess = null;
let automationStartTime = null;

app.get('/api/vehicles', async (req, res) => {
    try {
        const vehicles = await db.getVehicles();
        res.json(vehicles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/vehicles', async (req, res) => {
    const { vehicle_no } = req.body;
    try {
        await db.addVehicle(vehicle_no);
        startAutomationInternal(); // Auto-start if not running
        res.status(201).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** POST { "id": 1 } — audit one saved report with AI (needs OPENAI_API_KEY). */
app.post('/api/ai-audit', async (req, res) => {
    const id = req.body?.id;
    if (id == null) {
        return res.status(400).json({ error: 'Missing body.id (vehicle row id)' });
    }
    try {
        const row = await db.getVehicleById(id);
        if (!row) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }
        if (!row.full_data) {
            return res.status(400).json({ error: 'No full_data on this row yet' });
        }
        const allData = JSON.parse(row.full_data);
        const audit = await auditScrapedData(row.vehicle_no, allData);
        if (audit.skipped) {
            return res.status(400).json({ error: audit.reason });
        }
        if (audit.error) {
            return res.status(502).json({ error: audit.detail, status: audit.status });
        }
        res.json({ vehicle_no: row.vehicle_no, review: audit.message, model: audit.model, truncated: audit.truncated });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/** POST /api/save-json — Parse raw JSON and save to DB. */
app.post('/api/save-json', async (req, res) => {
    try {
        const results = await processJsonToDb(req.body);
        res.json({ status: 'success', results });
    } catch (err) {
        res.status(400).json({ status: 'error', message: err.message });
    }
});

/** GET /api/vehicle-history/:vehicleNo — Return full structured history. */
app.get('/api/vehicle-history/:vehicleNo', async (req, res) => {
    try {
        const history = await db.getFullVehicleHistory(req.params.vehicleNo);
        if (!history) {
            return res.status(404).json({ status: "error", message: "Vehicle not found" });
        }
        res.json(history);
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

function startAutomationInternal() {
    if (automationProcess) return false;

    log(`[Server] Starting automation process...`);
    automationStartTime = Date.now();
    automationProcess = spawn('node', ['automation.js'], {
        cwd: __dirname,
        env: { ...process.env, DEBUG: 'pw:browser' } // Add debug info
    });

    automationProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log(`[Automation]: ${msg}`);
        // Optionally save last log to a file for frontend to read
        fs.appendFileSync(path.join(__dirname, 'automation.log'), msg);
    });

    automationProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error(`[Automation Error]: ${msg}`);
        fs.appendFileSync(path.join(__dirname, 'automation.log'), msg);
    });
    
    automationProcess.on('close', (code) => {
        console.log(`Automation process exited with code ${code}`);
        automationProcess = null;
        if (code !== 0) {
            console.error(`Automation failed to start or crashed. Check automation.log`);
        }
    });
    return true;
}

function log(msg) {
    console.log(msg);
    fs.appendFileSync(path.join(__dirname, 'server.log'), `[${new Date().toISOString()}] ${msg}\n`);
}

app.post('/api/start-automation', (req, res) => {
    // Clear old logs and screenshots
    try {
        if (fs.existsSync(path.join(__dirname, 'public', 'live_log.txt'))) {
            fs.writeFileSync(path.join(__dirname, 'public', 'live_log.txt'), '');
        }
        if (fs.existsSync(path.join(__dirname, 'automation.log'))) {
            fs.writeFileSync(path.join(__dirname, 'automation.log'), '');
        }
        if (fs.existsSync(path.join(__dirname, 'public', 'live.jpg'))) {
            fs.unlinkSync(path.join(__dirname, 'public', 'live.jpg'));
        }
    } catch (e) {
        console.error('Failed to clear logs:', e);
    }
    
    const started = startAutomationInternal();
    if (!started) {
        return res.status(400).json({ message: 'Automation already running' });
    }
    res.json({ message: 'Automation started' });
});

app.post('/api/stop-automation', (req, res) => {
    if (automationProcess) {
        automationProcess.kill('SIGINT');
        return res.json({ message: 'Stop command sent' });
    }
    res.status(400).json({ message: 'Automation not running' });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        running: !!automationProcess,
        uptime: automationProcess ? Math.floor((Date.now() - automationStartTime) / 1000) : 0
    });
});

app.post('/api/browser-input', (req, res) => {
    const { text, action, x, y } = req.body;
    if (automationProcess) {
        const payload = JSON.stringify({ text, action, x, y }) + '\n';
        automationProcess.stdin.write(payload);
        return res.json({ status: 'sent' });
    }
    res.status(400).json({ error: 'Automation not running' });
});


app.post('/api/save-manual-data', async (req, res) => {
    try {
        const { vehicle_no, data } = req.body;
        if (!vehicle_no) return res.status(400).json({ error: 'No vehicle number' });
        
        // Save the raw data into the DB
        await db.updateVehicleByNumber(vehicle_no, {
            status: 'Completed',
            full_data: JSON.stringify(data),
            last_updated: new Date()
        });
        
        res.json({ success: true, message: `Vehicle ${vehicle_no} saved successfully!` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let addedCount = 0;
        let skippedCount = 0;
        console.log(`[Excel] Processing ${data.length} rows...`);

        for (const row of data) {
            // Find any column that might be the vehicle number
            const vehicle_no = (row['Vehicle Number'] || row['Vehicle No'] || row['registration_no'] || row['VehicleNumber'] || Object.values(row)[0])
                ?.toString()?.trim()?.toUpperCase();

            if (vehicle_no && vehicle_no.length >= 6) {
                try {
                    await db.addVehicle(vehicle_no);
                    console.log(`[Excel] Added: ${vehicle_no}`);
                    addedCount++;
                } catch (e) {
                    console.log(`[Excel] Skipped (Duplicate): ${vehicle_no}`);
                    skippedCount++;
                }
            } else {
                console.log(`[Excel] Skipped (Invalid): ${JSON.stringify(row)}`);
                skippedCount++;
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        if (addedCount > 0) {
            startAutomationInternal(); // Auto-start if not running
        }

        res.json({ 
            message: `Excel processed: ${addedCount} vehicles added, ${skippedCount} skipped (duplicates or invalid).`,
            added: addedCount,
            skipped: skippedCount
        });
    } catch (err) {
        if (req.file) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: err.message });
    }
});

/** GET /api/sample-excel — Generate and download a sample Excel template. */
app.get('/api/sample-excel', (req, res) => {
    const data = [
        { "Vehicle Number": "DL1CA1234" },
        { "Vehicle Number": "MH12AB5678" },
        { "Vehicle Number": "KA01XY0001" }
    ];
    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Vehicles");
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename="vahan_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

const PORT = process.env.PORT || 3010;
db.init().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});


