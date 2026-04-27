const db = require('./db_manager');

async function clear() {
    await db.init();
    await db.clearAllData();
    process.exit(0);
}

clear().catch(err => {
    console.error(err);
    process.exit(1);
});
