
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3002;

// Middleware
app.use(express.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT,
    plan TEXT,
    generationsUsed INTEGER DEFAULT 0,
    lastResetDate TEXT
  )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });
}

// Helper: Check and Reset Monthly Quota
function checkAndResetMonthlyQuota(user) {
    const now = new Date();
    const lastReset = new Date(user.lastResetDate);

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        console.log(`[Server DB] Resetting quota for ${user.email}`);
        return {
            ...user,
            generationsUsed: 0,
            lastResetDate: now.toISOString()
        };
    }
    return user;
}

// Routes

// Get User (Login/Fetch)
app.post('/api/user', (req, res) => {
    const { email, defaultPlan } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (row) {
            // User exists, check reset
            let user = checkAndResetMonthlyQuota(row);

            // If reset happened, update DB
            if (user.lastResetDate !== row.lastResetDate) {
                db.run(
                    "UPDATE users SET generationsUsed = ?, lastResetDate = ? WHERE email = ?",
                    [user.generationsUsed, user.lastResetDate, email],
                    (updateErr) => {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json(user);
                    }
                );
            } else {
                res.json(user);
            }
        } else {
            // Create new user
            const newUser = {
                email,
                name: email.split('@')[0],
                plan: defaultPlan || 'talisma',
                generationsUsed: 0,
                lastResetDate: new Date().toISOString()
            };

            db.run(
                "INSERT INTO users (email, name, plan, generationsUsed, lastResetDate) VALUES (?, ?, ?, ?, ?)",
                [newUser.email, newUser.name, newUser.plan, newUser.generationsUsed, newUser.lastResetDate],
                function (insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });
                    res.json(newUser);
                }
            );
        }
    });
});

// Increment Usage
app.post('/api/usage/increment', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });

        // Check reset first (just in case)
        let user = checkAndResetMonthlyQuota(row);

        // Increment
        user.generationsUsed += 1;

        db.run(
            "UPDATE users SET generationsUsed = ?, lastResetDate = ? WHERE email = ?",
            [user.generationsUsed, user.lastResetDate, email],
            (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json(user);
            }
        );
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
