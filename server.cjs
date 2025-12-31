
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const port = 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve static files

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

// Configuração dos Planos (Regra de Negócio) - Legacy Seed
const LEGACY_USERS = [
    { email: 'giordano@hareware.com.br', password: 'HareWare@2025@Magic', plan: 'oraculo' },
    { email: 'viviane@vivianeturismo.com.br', password: 'viviane@2025', plan: 'talisma' },
    { email: 'diego@seupao.com.br', password: 'seupao@2025', plan: 'conjurador' },
    { email: 'demo@haremagic.com', password: '123456', plan: 'encantamento' },
    { email: 'hangarmixshop@gmail.com', password: 'mix@2025', plan: 'oraculo' },
    { email: 'teste@teste.com.br', password: '123456', plan: 'oraculo' },
    { email: 'amandabarbosafilhadedeus@gmail.com', password: 'amanda@2025', plan: 'encantamento' },
    { email: 'leoocosta1209@gmail.com', password: 'leo@2025', plan: 'conjurador' },
    { email: 'deboraalmeida2397@gmail.com', password: 'taurus@2025', plan: 'encantamento' },
    { email: 'oquemedernatelhacanal@gmail.com', password: 'daniela@2025', plan: 'oraculo' },
    { email: 'contato@sbmmkt.com.br', password: 'sbm@2025', plan: 'encantamento' },
];

function initDb() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password TEXT,
    name TEXT,
    plan TEXT,
    generationsUsed INTEGER DEFAULT 0,
    lastResetDate TEXT
  )`, (err) => {
        if (err) {
            console.error('Error creating table users:', err.message);
        } else {
            // Seed Legacy Users
            const stmt = db.prepare("INSERT OR IGNORE INTO users (email, password, name, plan, generationsUsed, lastResetDate) VALUES (?, ?, ?, ?, ?, ?)");
            LEGACY_USERS.forEach(user => {
                stmt.run(user.email, user.password, user.email.split('@')[0], user.plan, 0, new Date().toISOString());
            });
            stmt.finalize();

            // Force update specifically for Admin to ensure Oracle plan even if previously created
            db.run("UPDATE users SET plan = 'oraculo' WHERE email = 'giordano@hareware.com.br'");

            console.log("Legacy users verified/seeded.");
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS ip_logs (
        ip TEXT,
        created_at TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table ip_logs:', err.message);
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
// Auth Routes

// Register
app.post('/auth/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and Password are required' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Check IP limit (e.g., max 2 accounts per 24h)
    db.get(
        "SELECT COUNT(*) as count FROM ip_logs WHERE ip = ? AND created_at > datetime('now', '-1 day')",
        [ip],
        (err, row) => {
            if (err) {
                console.error("Error checking IP logs:", err);
                // Continue on error to not block legit users if DB fails check
            }

            if (row && row.count >= 2) {
                return res.status(429).json({ error: 'Limite de criação de contas atingido para este dispositivo. Tente novamente amanhã.' });
            }

            const newUser = {
                email,
                password, // In a real app, hash this!
                name: email.split('@')[0],
                plan: 'talisma', // Default plan as requested
                generationsUsed: 0,
                lastResetDate: new Date().toISOString()
            };

            db.run(
                "INSERT INTO users (email, password, name, plan, generationsUsed, lastResetDate) VALUES (?, ?, ?, ?, ?, ?)",
                [newUser.email, newUser.password, newUser.name, newUser.plan, newUser.generationsUsed, newUser.lastResetDate],
                function (insertErr) {
                    if (insertErr) {
                        if (insertErr.message.includes('UNIQUE constraint failed')) {
                            return res.status(400).json({ error: 'User already exists' });
                        }
                        return res.status(500).json({ error: insertErr.message });
                    }

                    // Log IP
                    db.run("INSERT INTO ip_logs (ip, created_at) VALUES (?, datetime('now'))", [ip]);

                    // Return user without password
                    const { password, ...userWithoutPass } = newUser;
                    res.json(userWithoutPass);
                }
            );
        }
    );
});

// Login
app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and Password are required' });
    }

    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        if (row) {
            const user = checkAndResetMonthlyQuota(row);
            // If reset happened, update DB
            if (user.lastResetDate !== row.lastResetDate) {
                db.run(
                    "UPDATE users SET generationsUsed = ?, lastResetDate = ? WHERE email = ?",
                    [user.generationsUsed, user.lastResetDate, email],
                    (e) => { if (e) console.error(e); }
                );
            }

            const { password, ...userWithoutPass } = user;
            res.json(userWithoutPass);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Get User (Sync/Reload - Protected-ish)
app.post('/user', (req, res) => {
    const { email } = req.body;

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
                        const { password, ...u } = user;
                        res.json(u);
                    }
                );
            } else {
                const { password, ...u } = user;
                res.json(u);
            }
        } else {
            return res.status(404).json({ error: 'User not found' });
        }
    });
});

// Configuração dos Planos para Validação no Servidor
const PLANS = {
    talisma: { limit: 5 },
    encantamento: { limit: 20 },
    conjurador: { limit: 50 },
    oraculo: { limit: 100 },
};

// Increment Usage
app.post('/usage/increment', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });

        // Check reset first
        let user = checkAndResetMonthlyQuota(row);

        // Server-side Limit Validation
        const planLimit = PLANS[user.plan]?.limit || 5; // Default to Talismã if unknown

        if (user.generationsUsed >= planLimit) {
            return res.status(403).json({
                error: `Limite do plano atingido no servidor (${user.generationsUsed}/${planLimit}). Upgrade necessário.`
            });
        }

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

// Explicit Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Fallback to React App for non-API routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
