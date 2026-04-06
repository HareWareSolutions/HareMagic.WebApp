const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

const now = new Date().toISOString();

db.run("UPDATE users SET generationsUsed = 0, lastResetDate = ?", [now], function(err) {
    if (err) {
        console.error('Error updating credits:', err.message);
    } else {
        console.log(`Success: Credits reset for all ${this.changes} users.`);
    }
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed.');
    });
});
