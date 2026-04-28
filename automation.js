const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const db = require('./db_manager');
const config = require('./config');
const { auditScrapedData } = require('./ai_data_check');

let startTime = Date.now();
function log(message) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const time = new Date().toLocaleTimeString();
    const fullMsg = `[${time}] [+${elapsed}s] ${message}`;
    console.log(fullMsg);
    
    // Save to a public log for frontend to see
    try {
        fs.appendFileSync(path.join(__dirname, 'public', 'live_log.txt'), fullMsg + '\n');
    } catch (e) {}
}

async function takeScreenshot(page, name = 'live') {
    try {
        const screenshotPath = path.join(__dirname, 'public', `${name}.jpg`);
        await page.screenshot({ path: screenshotPath, quality: 60, type: 'jpeg' });
        // Also save a copy for history if needed, but 'live.jpg' is what the dashboard will watch
    } catch (e) {
        log(`⚠️ Screenshot failed: ${e.message}`);
    }
}

// Human-like delay helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const humanDelay = async () => {
    const config = getLiveConfig();
    const min = config.human_delay_min_ms || 2000;
    const max = config.human_delay_max_ms || 3000;
    await delay(min + Math.random() * (max - min));
};

function getLiveConfig() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'live_config.json'), 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { tabs: ['Owner Details', 'Vehicle Details', 'Vehicle History Details'] };
    }
}

/** Simulates a small, natural mouse movement before clicking. */
async function mouseJitter(page) {
    const x = Math.floor(Math.random() * 10) - 5;
    const y = Math.floor(Math.random() * 10) - 5;
    await page.mouse.move(100 + x, 100 + y, { steps: 5 });
}

function normalizeVehicleNo(vehicleNo) {
    return String(vehicleNo || '').trim().toUpperCase().replace(/\s+/g, '');
}

/** Fills the Vahan registration field from the DB queue (Playwright — not Cursor chat). */
async function fillRegistrationNumber(page, vehicleNo) {
    const reg = normalizeVehicleNo(vehicleNo);
    if (!reg) throw new Error('Empty vehicle number');

    const selectors = [
        'input[id*="regn_no"]:not([type="hidden"])',
        'input[name*="regn_no"]:not([type="hidden"])',
        'input[id*="tf_regn"]:not([type="hidden"])',
        'input[id*="regnNo"]:not([type="hidden"])',
        'input.ui-inputfield[id*="regn"]:not([type="hidden"])',
    ];

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const el = await page.waitForSelector('input[id*="regn"], input[id*="tfRegNo"], .ui-inputfield', { state: 'visible', timeout: 15000 });
            await mouseJitter(page);
            await el.click();
            await delay(500);
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Backspace');
            await delay(300);
            
            // Type like a human
            for (const char of reg) {
                await page.keyboard.type(char, { delay: 100 + Math.random() * 150 });
            }
            
            await delay(1000);
            const val = normalizeVehicleNo(await el.inputValue().catch(() => ''));
            if (val.includes(reg) || reg.includes(val)) {
                log(`✅ Registration field set to: ${val}`);
                return;
            }
        } catch (e) {
            log(`⚠️ Attempt ${attempt} to find input box failed. Retrying...`);
            await delay(2000);
        }
    }
    throw new Error('Could not find registration input box after 3 attempts');
}

async function runAutomation() {
    startTime = Date.now();
    let isProcessingQueue = false;
    await db.init();

    
    log(`[${new Date().toLocaleTimeString()}] Launching browser (HEADLESS: ${config.HEADLESS})...`);
    const browser = await chromium.launch({
        headless: config.HEADLESS,
        args: [
            '--start-maximized', 
            '--disable-blink-features=AutomationControlled', 
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Critical for low-memory Linux servers
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-zygote'
        ]
    });

    const browserContext = await browser.newContext({
        viewport: { width: 1280, height: 800 }
    });

    const page = await browserContext.newPage();
    
    // GRACEFUL LOGOUT HANDLER
    const performLogout = async () => {
        log('🛑 Attempting graceful logout...');
        try {
            await page.goto('https://vahan.parivahan.gov.in/vahan/vahan/home.xhtml').catch(() => {});
            await delay(1000);
            await page.click('a:has-text("Logout"), [id*="logout"]', { timeout: 5000 });
            await delay(1000);
            await page.click('span:has-text("Yes"), button:has-text("Yes")', { timeout: 5000 });
            log('✅ Logged out successfully.');
        } catch (e) {
            log('⚠️ Could not perform automatic logout (Session might already be closed).');
        }
    };

    process.on('SIGINT', async () => {
        log('⚠️ Stop command received. Shutting down...');
        await performLogout();
        await browserContext.close();
        process.exit(0);
    });
    
    // ADD GHOST CURSOR for visibility
    await page.addInitScript(() => {
        const cursor = document.createElement('div');
        cursor.id = 'automation-cursor';
        cursor.style.cssText = `
            position: fixed; pointer-events: none;
            width: 20px; height: 20px; border-radius: 50%;
            background: rgba(255, 0, 0, 0.6); border: 2px solid white;
            z-index: 999999; transition: all 0.2s ease;
            transform: translate(-50%, -50%); display: none;
        `;
        document.documentElement.appendChild(cursor);
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.pageX + 'px';
            cursor.style.top = e.pageY + 'px';
            cursor.style.display = 'block';
        });
    });

    // Take a screenshot every 5 seconds to update the live view
    const screenshotInterval = setInterval(async () => {
        if (!page.isClosed()) {
            await takeScreenshot(page);
        } else {
            clearInterval(screenshotInterval);
        }
    }, 5000);
    
    // LISTEN FOR REMOTE INPUT FROM SERVER
    process.stdin.on('data', async (data) => {
        try {
            const { text, action, x, y } = JSON.parse(data.toString());
            if (text) {
                log(`⌨️ Remote input received: typing "${text}"`);
                const inputs = await page.$$('input:visible');
                for (const input of inputs) {
                    const id = await input.getAttribute('id');
                    const isUserOrPass = id && (id.includes('user_id') || id.includes('password'));
                    const val = await input.inputValue();
                    if (!isUserOrPass && !val) {
                        await input.click(); // Focus first
                        await page.keyboard.type(text, { delay: 100 }); // Type like a human
                        log(`✅ Typed into field: ${id}`);
                        break;
                    }
                }
            }
            if (action === 'login') {
                log('🖱️ Remote action: Clicking Login/Submit');
                const selectors = [
                    'button:has-text("Submit")', 'button:has-text("Login")', 
                    '[id*="submit"]', '[id*="login"]', '.ui-button', 'input[type="submit"]'
                ];
                for (const sel of selectors) {
                    try {
                        const btn = page.locator(sel).visible().first();
                        if (await btn.count() > 0) {
                            await btn.click({ force: true, timeout: 2000 });
                            log(`✅ Clicked button using selector: ${sel}`);
                            break;
                        }
                    } catch (e) {}
                }
            }
            if (action === 'enter') {
                log('⌨️ Remote action: Pressing Enter');
                await page.keyboard.press('Enter');
            }
            if (action === 'click' && typeof x === 'number' && typeof y === 'number') {
                log(`🖱️ Remote click at: ${x}, ${y}`);
                await page.mouse.click(x, y);
            }
            if (action === 'go_to_login') {
                log('🏠 Navigating to Login Page as requested...');
                await page.goto('https://vahan.parivahan.gov.in/vahan/vahan/ui/login/login.xhtml');
            }
            if (action === 'start_queue') {
                log('🚀 START COMMAND RECEIVED! Now processing vehicles...');
                isProcessingQueue = true;
            }
        } catch (e) {
            log(`⚠️ Remote input error: ${e.message}`);
        }
    });


    // Monitor for Session Warnings
    page.on('framenavigated', async (frame) => {
        if (frame === page.mainFrame() && page.url().includes('warning.xhtml')) {
            log('❌ CRITICAL: SESSION WARNING DETECTED! Portal has blocked this session.');
            log('👉 Please click "Re-Login" manually or close and restart.');
        }
    });

    // Log every page navigation
    page.on('framenavigated', frame => {
        if (frame === page.mainFrame()) {
            log(`➡️ Navigated to: ${page.url()}`);
        }
    });

    // Inject click logging
    await page.exposeFunction('logClick', (data) => {
        log(`🖱️ User Clicked: <${data.tag}> "${data.text.substring(0, 20)}" (ID: ${data.id})`);
    });

    await page.addInitScript(() => {
        document.addEventListener('click', (e) => {
            window.logClick({
                tag: e.target.tagName,
                text: e.target.innerText || '',
                id: e.target.id || ''
            });
        }, true);
    });

    try {
        log('Navigating to Vahan Login page...');
        await page.goto('https://vahan.parivahan.gov.in/vahan/vahan/ui/login/login.xhtml');

        log(`➡️ Navigated to: ${page.url()}`);

        // Check if we are truly logged in by looking for the "Report" menu
        const isLoggedIn = await page.$('text="Report"').catch(() => null);
        
        if (!isLoggedIn) {
            // Wait for the login form to be visible (handles "Something went wrong" screens gracefully)
            log('Waiting for login form to be ready...');
            await page.waitForSelector('input[id*="user_id"]', { state: 'visible', timeout: 120000 });
            
            log('Filling User ID...');
            await page.fill('input[id*="user_id"]', config.VAHAN_USER);
            log('⚠️ ACTION REQUIRED: Please solve the CAPTCHA and click Login.');
            
            // Wait for password field or OTP field
            await page.waitForSelector('input[id*="password"], input[id*="otp"]', { timeout: 120000 }).catch(() => {});
            
            if (await page.$('input[id*="password"]')) {
                log('Filling Password...');
                await page.fill('input[id*="password"]', config.VAHAN_PASS);
                log('⚠️ ACTION REQUIRED: Please enter the OTP and click Submit.');
            }
        }

        // 4. Wait for dashboard
        log('Waiting for you to complete login... (Waiting for Dashboard)');
        try {
            // Wait for any dashboard element to confirm we are in
            await page.waitForSelector('text="Report"', { state: 'visible', timeout: 300000 });
            log('✅ Login Successful! Dashboard detected.');
            
            log('⏳ Moving to search page via menu...');
            await page.locator('text="Report"').first().hover();
            await delay(1000);
            
            const detailsLink = page.locator('#vchDtlsId').or(page.locator('text="Registered Vehicle Details"')).first();
            await detailsLink.evaluate(el => el.setAttribute('target', '_self'));
            await detailsLink.click({ force: true });
        } catch (e) {
            log(`🛑 Dashboard/Menu issue: ${e.message}`);
            log('Attempting to recover via human-like refresh...');
            await page.reload();
            await delay(2000);
        }
        
        const pageType = await Promise.race([
            page.waitForSelector('input[id*="regn"], input[id*="tfRegNo"], .ui-inputfield', { state: 'visible', timeout: 20000 }).then(() => 'search'),
            page.waitForSelector('text="Vehicle History Details"', { state: 'visible', timeout: 20000 }).then(() => 'details')
        ]);

    if (pageType === 'details') {
        log('✨ Detected you are already on the Details page. Starting scraping...');
    } else {
        log('🚀 Ready! Processing the queue...');
    }

        // 6. Infinite Loop to process vehicles
        log('🚀 Automation is standby. Please login manually then click "Start Scraping Queue".');
        
        while (true) {
            if (!isProcessingQueue) {
                await delay(2000);
                continue;
            }

            const allVehicles = await db.getAllVehicles();

            const vehicles = allVehicles.filter(v => v.status === 'Pending' || v.status === 'Error');
            
            if (vehicles.length > 0) {
                log(`📊 Found ${vehicles.length} vehicles to process.`);
                for (const vehicle of vehicles) {
                    log(`🔍 Processing vehicle: ${vehicle.vehicle_no}`);
                    try {
                        // Ensure we are actually on a page with a search box before starting
                        await page.waitForSelector('input[id*="regn"], input[id*="tfRegNo"], .ui-inputfield', { state: 'visible', timeout: 30000 });
                        await delay(500);
                        
                        await processVehicle(page, vehicle);
                        log(`✅ Successfully processed: ${vehicle.vehicle_no}`);
                        await humanDelay(); // Rest between vehicles
                    } catch (err) {
                        log(`⚠️ Issue processing ${vehicle.vehicle_no}: ${err.message}`);
                        // Try to recover to search page for the next one
                        await page.goto('https://vahan.parivahan.gov.in/vahan/vahan/ui/report/form_vehicleDetails.xhtml?reportCall=reportCall').catch(() => {});
                        await delay(2000);
                    }
                }
                log('🏁 Batch complete. Scanning for new entries...');
            }
            
            // Wait 5 seconds before checking the database again
            await delay(5000);
        }
    } catch (error) {
        log(`🛑 Automation stopped: ${error.message}`);
        if (typeof performLogout === 'function') await performLogout();
    }
}

async function processVehicle(page, vehicle) {
    const regDisplay = normalizeVehicleNo(vehicle.vehicle_no);
    log(`🔍 Processing vehicle: ${regDisplay}`);
    
    // Check if details are already visible
    const pageContent = await page.innerText('body').catch(() => '');
    if (pageContent.includes(regDisplay) && pageContent.includes('Vehicle History Details')) {
        log('✨ Vehicle already loaded. Skipping search.');
    } else {
        log(`⌨️ Auto-filling registration number from queue: ${regDisplay}`);
        await fillRegistrationNumber(page, vehicle.vehicle_no);
        
        log('🖱️ Automation Clicked: [Show Details]');
        await page.click('button:has-text("Show Details"), [id*="show_details"]');
        await humanDelay();
        
        // WAIT for either the results page OR an error message
        log('⏳ Waiting for results to load...');
        const searchResult = await Promise.race([
            page.waitForSelector('text="Vehicle History Details"', { timeout: 15000 }).then(() => 'success'),
            page.waitForSelector('.ui-messages-error:visible', { timeout: 10000 }).then(() => 'error'),
            page.waitForSelector('text="No Record Found"', { timeout: 10000 }).then(() => 'error'),
            page.waitForSelector('text="Registration No. Not Found"', { timeout: 5000 }).then(() => 'not_found'),
            delay(10000).then(() => 'timeout')
        ]);

        if (searchResult === 'not_found' || searchResult === 'error') {
            log(`⚠️ Vehicle ${regDisplay} not found or error occurred. Handling popup...`);
            await handlePopups(page);
            await db.updateVehicle(vehicle.id, { status: 'No Data' });
            return; // Move to next vehicle
        }

        if (searchResult !== 'success') {
            log(`⚠️ Search failed or timed out (${searchResult}). Skipping to next vehicle.`);
            throw new Error(`Vehicle search failed: ${searchResult}`);
        }
        
        // Handle any informational popups that appear after search
        await handlePopups(page);
    }
    
    log('✅ Details page loaded. Starting deep scrape...');

    const allData = { registration_number: regDisplay };

    // 1. Scrape Main Tabs (names match portal labels; extra tabs are skipped if not on page)
    const liveConfig = getLiveConfig();
    const tabs = liveConfig.tabs || ['Owner Details', 'Vehicle Details'];

    for (const tab of tabs) {
        const tabName = typeof tab === 'object' ? tab.name : tab;
        const tabText = typeof tab === 'object' ? tab.text : tab;
        
        await handlePopups(page);
        log(`🖱️ Automation Clicked Tab: [${tabName}]`);
        try {
            const tabElement = await page.locator(`button:has-text("${tabText}"), a:has-text("${tabText}")`).first();
            if (await tabElement.count() === 0) {
                log(`⏭️ Tab not on page (skipped): ${tabName}`);
                continue;
            }
            await tabElement.click({ force: true, timeout: 5000 }).catch(() => {});
            await page.waitForSelector('.ui-blockui', { state: 'hidden', timeout: 5000 }).catch(() => {});
            await humanDelay();
            await scrollDataTablesForFullWidth(page);
            const tabData = await scrapeTableData(page);
            allData[tab] = tabData;
            log(`✅ Captured ${Array.isArray(tabData) ? tabData.length : 'details'} from ${tabName}`);
        } catch (e) {
            log(`⚠️ Could not process tab ${tab}: ${e.message}`);
        }
    }

    // 2. Exhaustive History Dropdown Loop
    log('🖱️ Automation Clicked Tab: [Vehicle History Details]');
    try {
        await page.click('text="Vehicle History Details"');
        await page.waitForSelector('.ui-blockui', { state: 'hidden', timeout: 5000 }).catch(() => {});
        await delay(300); // Reduced from 1000

        log('🖱️ Automation Clicked: [History Dropdown]');
        await page.click('label[id*="cm_selection_label"]');
        
        // Wait for the specific history panel to be visible
        const panelSelector = '[id*="cm_selection_panel"].ui-selectonemenu-panel:visible, .ui-selectonemenu-panel[style*="display: block"]';
        await page.waitForSelector(panelSelector, { state: 'visible', timeout: 3000 });

        const options = await page.$$eval(`${panelSelector} li.ui-selectonemenu-item`, els => 
            els.map(el => el.innerText.trim()).filter(t => t && !t.includes('--Select'))
        );

        log(`📊 Found ${options.length} history options.`);
        allData.history = {};

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            await handlePopups(page);
            log(`Selecting: ${option}`);
            await page.click('label[id*="cm_selection_label"]');
            await page.waitForSelector(panelSelector, { state: 'visible' });
            
            // USE REGEX FOR ABSOLUTE MATCHING
            // This prevents "History of Paid Road Tax" from matching "History of Paid Fees"
            const escapedOption = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            await page.locator(`${panelSelector} li.ui-selectonemenu-item`)
                .filter({ hasText: new RegExp(`^${escapedOption}$`) })
                .first()
                .click({ force: true });

            log(`⏳ Waiting for [${option}] data...`);
            await page.waitForSelector('.ui-blockui', { state: 'hidden', timeout: 15000 }).catch(() => {});
            await delay(500); // Reduced from 2000
            await scrollDataTablesForFullWidth(page);
            const historyDataRows = await scrapeTableData(page);
            
            if (Array.isArray(historyDataRows)) {
                allData.history[option] = historyDataRows;
                log(`✅ ${option}: Saving ${historyDataRows.length} records to DB...`);
                for (const row of historyDataRows) {
                    await db.saveHistoryRecord(vehicle.id, option, row);
                }
            } else if (historyDataRows) {
                allData.history[option] = [historyDataRows];
                await db.saveHistoryRecord(vehicle.id, option, historyDataRows);
                log(`✅ ${option}: 1 record saved.`);
            } else {
                log(`✅ ${option}: 0 records found.`);
            }
        }
    } catch (e) {
        log(`⚠️ Error in History dropdown: ${e.message}`);
    }

    log(`📊 --- SCRAPED DATA FOR ${vehicle.vehicle_no} ---`);
    console.log(JSON.stringify(allData, null, 2));

    log(`💾 Saving FULL report for ${vehicle.vehicle_no} to database...`);
    
    // Safely extract owner name (looking for various keys)
    let ownerName = null;
    if (allData["Owner Details"]) {
        const od = allData["Owner Details"];
        const dataObj = Array.isArray(od) ? od[0] : od;
        if (dataObj) {
            // Find the first key that includes "Owner Name"
            const ownerKey = Object.keys(dataObj).find(k => k.toLowerCase().includes('owner name'));
            ownerName = ownerKey ? dataObj[ownerKey] : (dataObj["Owner Name"] || dataObj["OwnerName"] || dataObj["OWNER NAME"]);
        }
    }

    // The actual database update is now handled by the AI Parser section below
    // which extracts all structured fields.


    try {
        const audit = await auditScrapedData(vehicle.vehicle_no, allData);
        if (audit.ok && audit.data) {
            log(`🤖 AI Parser (${audit.model}${audit.truncated ? ', input truncated' : ''}): Successfully extracted structured data.`);
            await db.updateVehicle(vehicle.id, { 
                ...audit.data,
                status: "Completed",
                full_data: JSON.stringify(allData) 
            });
        } else {
            if (audit.error) log(`🤖 AI Parser failed: ${audit.status || ''} ${audit.detail || ''}`.trim());
            
            // Fallback: Save with basic info if AI fails
            await db.updateVehicle(vehicle.id, { 
                owner_name: ownerName || null,
                status: "Completed",
                full_data: JSON.stringify(allData) 
            });
        }
    } catch (e) {
        log(`🤖 AI Parser error: ${e.message}`);
        // Ensure data is saved even if AI logic fails
        await db.updateVehicle(vehicle.id, { 
            owner_name: ownerName || null,
            status: "Completed",
            full_data: JSON.stringify(allData) 
        });
    }

    log('↩️ Automation returning to search page...');
    try {
        await page.locator('text="Report"').first().hover();
        await delay(500);
        const link = page.locator('#vchDtlsId').or(page.locator('text="Registered Vehicle Details"')).first();
        // Force same tab to avoid user frustration with many tabs
        await link.evaluate(el => el.setAttribute('target', '_self'));
        await link.click({ force: true });
        await page.waitForSelector('input[id*="regn"], input[id*="tfRegNo"], .ui-inputfield', { state: 'visible', timeout: 15000 });
    } catch (e) {
        log(`⚠️ Could not return via menu: ${e.message}. Attempting direct URL fallback...`);
        await page.goto('https://vahan.parivahan.gov.in/vahan/vahan/ui/report/form_vehicleDetails.xhtml?reportCall=reportCall', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        await delay(2000);
    }
}

/** Closes informational popups/dialogs if they appear. */
async function handlePopups(page) {
    try {
        const closeBtn = page.locator('.ui-dialog-titlebar-close:visible, .ui-icon-closethick:visible, .ui-dialog-titlebar-icon:visible').first();
        if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
            log('🎯 Detected Info/Warning popup. Closing...');
            await closeBtn.click({ force: true });
            await delay(1000);
            
            // Check if there are more (sometimes multiple stacked)
            await handlePopups(page);
        }
    } catch (e) {
        // Silently fail if no popup
    }
}

/** Scroll wide PrimeFaces datatables so all columns are laid out / visible for scraping. */
async function scrollDataTablesForFullWidth(page) {
    await page.evaluate(() => {
        const scrollers = document.querySelectorAll(
            '.ui-datatable-scrollable-body, .ui-datatable-scrollable-body-table, .ui-datatable-tablewrapper'
        );
        scrollers.forEach((el) => {
            try {
                el.scrollLeft = el.scrollWidth;
            } catch (e) {}
        });
    });
    await delay(300);
    await page.evaluate(() => {
        const scrollers = document.querySelectorAll(
            '.ui-datatable-scrollable-body, .ui-datatable-scrollable-body-table, .ui-datatable-tablewrapper'
        );
        scrollers.forEach((el) => {
            try {
                el.scrollLeft = 0;
            } catch (e) {}
        });
    });
}

async function scrapeTableData(page) {
    await scrollDataTablesForFullWidth(page);
    return await page.evaluate(() => {
        const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

        const containers = Array.from(
            document.querySelectorAll(
                '.ui-datatable-tablewrapper table, .ui-datatable-scrollable-body table, .ui-datatable table, .ui-panel-content table'
            )
        );

        if (containers.length === 0) {
            const cells = Array.from(document.querySelectorAll('td, span, label'));
            const data = {};
            for (let i = 0; i < cells.length; i++) {
                const text = cells[i].innerText.trim();
                if (text.endsWith(':')) {
                    const key = text.replace(':', '').trim();
                    const val = cells[i + 1]?.innerText.trim();
                    if (key && val) data[key] = val;
                }
            }
            return Object.keys(data).length > 0 ? data : null;
        }

        function bestHeaderRow(table) {
            // PrimeFaces scrollable tables separate header and body into two tables.
            // If we are in the body table, we need to find the headers in the header table.
            let headerTable = null;
            const scrollableBody = table.closest('.ui-datatable-scrollable-body');
            if (scrollableBody) {
                const wrapper = scrollableBody.closest('.ui-datatable-scrollable-wrapper');
                if (wrapper) {
                    headerTable = wrapper.querySelector('.ui-datatable-scrollable-header table');
                }
            }

            const sourceTable = headerTable || table;
            const thead = sourceTable.querySelector('thead');
            if (thead) {
                const trs = Array.from(thead.querySelectorAll('tr'));
                let best = [];
                for (const tr of trs) {
                    // Try to get column labels, ignoring rows that are likely filter inputs
                    const cells = Array.from(tr.querySelectorAll('th, td')).map((h) => {
                        // Prefer text from common PrimeFaces header containers
                        const label = h.querySelector('.ui-column-title, .ui-column-header-label');
                        return norm(label ? label.innerText : h.innerText);
                    });
                    const nonEmpty = cells.filter(Boolean);
                    if (nonEmpty.length > best.length) best = cells;
                }
                if (best.length) return best;
            }
            
            // Fallback to first row
            const firstTr = sourceTable.querySelector('tr');
            if (!firstTr) return [];
            return Array.from(firstTr.querySelectorAll('th, td.ui-state-default')).map((h) => norm(h.innerText));
        }

        function bodyRows(table) {
            const tb = table.querySelector('tbody');
            if (tb) return Array.from(tb.querySelectorAll('tr'));
            const all = Array.from(table.querySelectorAll('tr'));
            const thead = table.querySelector('thead');
            const skip = thead ? thead.querySelectorAll('tr').length : 1;
            return all.slice(skip);
        }

        const allTablesData = containers
            .map((table) => {
                const headers = bestHeaderRow(table);
                if (!headers.length) return null;

                const rows = bodyRows(table);
                const dataRows = rows
                    .map((row) => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (
                            cells.length === 0 ||
                            (cells.length === 1 && cells[0].innerText.includes('No records found'))
                        ) {
                            return null;
                        }

                        const rowData = {};
                        cells.forEach((cell, i) => {
                            const key = headers[i] || `column_${i}`;
                            rowData[key] = norm(cell.innerText);
                        });
                        return rowData;
                    })
                    .filter((r) => r !== null);

                return dataRows.length > 0 ? dataRows : null;
            })
            .filter((t) => t !== null);

        return allTablesData.length === 1 ? allTablesData[0] : allTablesData;
    });
}

runAutomation();


