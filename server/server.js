import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const dbName = process.env.DB_NAME || 'TicketGuzo_demo';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

let pool;
const adminPassword = process.env.ADMIN_PASSWORD || 'G@guzoticket';
const adminTokens = new Set();

const seedRoutes = [
  ['Addis Ababa','Bahir Dar','06:00 AM','04:00 PM','10h',750,'Standard','Daily',45],
  ['Addis Ababa','Dire Dawa','06:00 AM','02:00 PM','8h',850,'VIP','Daily',45],
  ['Addis Ababa','Hawassa','07:00 AM','11:00 AM','4h',450,'Standard','Daily',45],
  ['Addis Ababa','Gondar','05:00 AM','05:00 PM','12h',950,'VIP','Daily',45],
  ['Addis Ababa','Mekelle','04:00 AM','06:00 PM','14h',1100,'VIP','3x Weekly',45],
  ['Addis Ababa','Jimma','06:30 AM','12:30 PM','6h',550,'Standard','Daily',45],
  ['Addis Ababa','Jijiga','05:00 AM','05:00 PM','12h',1000,'VIP','Daily',45],
  ['Addis Ababa','Harar','05:30 AM','02:30 PM','9h',900,'VIP','Daily',45],
  ['Addis Ababa','Dessie','06:00 AM','02:00 PM','8h',700,'VIP','Daily',45],
  ['Addis Ababa','Adama','05:45 AM','09:15 AM','3.5h',320,'Standard','Daily',45],
  ['Addis Ababa','Debre Berhan','05:15 AM','10:45 AM','5.5h',420,'Standard','Daily',45],
  ['Addis Ababa','Shashemene','06:15 AM','11:15 AM','5h',430,'VIP','Daily',45],
  ['Addis Ababa','Nekemte','04:30 AM','12:30 PM','8h',680,'Standard','Daily',45],
  ['Addis Ababa','Welkite','05:00 AM','12:00 PM','7h',560,'Standard','Daily',45],
  ['Addis Ababa','Asosa','04:00 AM','03:30 PM','11.5h',980,'VIP','3x Weekly',45],
  ['Addis Ababa','Goba','05:30 AM','02:30 PM','9h',830,'VIP','Daily',45],
  ['Hawassa','Arba Minch','06:00 AM','11:00 AM','5h',400,'Standard','Daily',45],
  ['Hawassa','Dilla','07:00 AM','09:30 AM','2.5h',250,'Standard','Daily',45],
  ['Hawassa','Bahir Dar','05:30 AM','03:30 PM','10h',760,'VIP','2x Weekly',45],
  ['Hawassa','Addis Ababa','06:30 PM','11:30 PM','5h',430,'Standard','Daily',45],
  ['Bahir Dar','Gondar','07:00 AM','10:00 AM','3h',350,'VIP','Daily',45],
  ['Bahir Dar','Dessie','08:00 AM','01:00 PM','5h',390,'Standard','Daily',45],
  ['Dire Dawa','Harar','08:00 AM','09:30 AM','1.5h',150,'Standard','Daily',45],
  ['Dire Dawa','Jijiga','07:15 AM','10:45 AM','3.5h',280,'Standard','Daily',45],
  ['Jimma','Addis Ababa','02:00 PM','08:30 PM','6.5h',540,'Standard','Daily',45],
  ['Jimma','Nekemte','06:30 AM','09:30 AM','3h',260,'VIP','Daily',45],
  ['Gondar','Mekelle','07:00 AM','01:30 PM','6.5h',520,'Standard','3x Weekly',45],
  ['Harar','Dire Dawa','07:00 PM','08:30 PM','1.5h',180,'VIP','Daily',45]
];

async function initDatabase() {
  const adminConn = await mysql.createConnection(dbConfig);
  await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName.replace(/`/g, '')}\``);
  await adminConn.end();

  pool = mysql.createPool({
    ...dbConfig,
    database: dbName,
    waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true
  });

  await pool.query(`CREATE TABLE IF NOT EXISTS routes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time VARCHAR(20) NOT NULL,
    arrival_time VARCHAR(20) NOT NULL,
    duration VARCHAR(30) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    class_type ENUM('Standard','VIP') DEFAULT 'Standard',
    frequency VARCHAR(40) DEFAULT 'Daily',
    seats_total INT DEFAULT 45
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    passenger_name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(160),
    travel_date DATE NOT NULL,
    seats VARCHAR(255) NOT NULL,
    coach VARCHAR(50) DEFAULT 'Standard Coach',
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Upgrade older installations that already have bookings.
  const [cols] = await pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='bookings'`, [dbName]);
  const names = new Set(cols.map(c => c.COLUMN_NAME));
  if (!names.has('coach')) await pool.query('ALTER TABLE bookings ADD COLUMN coach VARCHAR(50) NULL DEFAULT "Standard Coach"');
  if (!names.has('payment_method')) await pool.query('ALTER TABLE bookings ADD COLUMN payment_method VARCHAR(50) NULL');
  if (!names.has('transaction_ref')) await pool.query('ALTER TABLE bookings ADD COLUMN transaction_ref VARCHAR(100) NULL');

  const [[count]] = await pool.query('SELECT COUNT(*) AS n FROM routes');
  const routeCount = Number(count.n || 0);
  if (routeCount < 20) {
    const extraRoutes = seedRoutes.slice(0, 20 - routeCount);
    if (extraRoutes.length) {
      await pool.query(`INSERT INTO routes
        (origin,destination,departure_time,arrival_time,duration,price,class_type,frequency,seats_total)
        VALUES ?`, [extraRoutes]);
    }
  }
}

function adminOnly(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) return res.status(401).json({ message: 'Admin login required' });
  next();
}

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'TicketGuzo API', database: dbName }));

app.get('/api/routes', async (req, res) => {
  try {
    const { origin, destination, class_type } = req.query;
    let sql = 'SELECT * FROM routes WHERE 1=1';
    const p = [];
    if (origin) { sql += ' AND origin=?'; p.push(origin); }
    if (destination) { sql += ' AND destination=?'; p.push(destination); }
    if (class_type && class_type !== 'All') { sql += ' AND class_type=?'; p.push(class_type); }
    sql += ' ORDER BY id';
    const [rows] = await pool.query(sql, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/routes/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM routes WHERE id=?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Route not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { route_id, passenger_name, phone, email, travel_date, seats, coach, total_amount } = req.body;
    if (!route_id || !passenger_name || !phone || !travel_date || !seats) return res.status(400).json({ message: 'Missing required booking fields' });
    const [routeRows] = await pool.query('SELECT * FROM routes WHERE id=?', [route_id]);
    if (!routeRows[0]) return res.status(404).json({ message: 'Route not found' });
    const [r] = await pool.query(
      'INSERT INTO bookings(route_id,passenger_name,phone,email,travel_date,seats,coach,total_amount,status) VALUES(?,?,?,?,?,?,?,?,?)',
      [route_id, passenger_name, phone, email || null, travel_date, seats, coach || 'Standard Coach', total_amount || 0, 'pending']
    );
    res.status(201).json({ id: r.insertId, message: 'Booking created. Continue to payment.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT b.*, r.origin, r.destination, r.departure_time, r.arrival_time, r.duration, r.class_type
      FROM bookings b JOIN routes r ON r.id=b.route_id WHERE b.id=?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Booking not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { booking_id, payment_method, transaction_ref } = req.body;
    if (!booking_id || !payment_method) return res.status(400).json({ message: 'Payment details are required' });
    const [r] = await pool.query(
      'UPDATE bookings SET status=?, payment_method=?, transaction_ref=? WHERE id=?',
      ['paid', payment_method, transaction_ref || `TG-${Date.now()}`, booking_id]
    );
    if (!r.affectedRows) return res.status(404).json({ message: 'Booking not found' });
    res.json({ ok: true, message: 'Payment recorded successfully' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'All fields are required' });
    await pool.query('INSERT INTO messages(name,email,message) VALUES(?,?,?)', [name, email, message]);
    res.status(201).json({ message: 'Message received' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== adminPassword) return res.status(401).json({ message: 'Incorrect admin password' });
  const token = crypto.randomUUID();
  adminTokens.add(token);
  res.json({ token, message: 'Admin login successful' });
});

app.post('/api/admin/logout', adminOnly, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  adminTokens.delete(token);
  res.json({ ok: true });
});

app.get('/api/admin/dashboard', adminOnly, async (_, res) => {
  try {
    const [[stats]] = await pool.query(`SELECT
      COUNT(*) AS bookings,
      COALESCE(SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END),0) AS paid_bookings,
      COALESCE(SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END),0) AS revenue
      FROM bookings`);
    const [bookings] = await pool.query(`SELECT b.*, r.origin, r.destination, r.departure_time
      FROM bookings b JOIN routes r ON r.id=b.route_id ORDER BY b.created_at DESC LIMIT 100`);
    const [messages] = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
    const [routes] = await pool.query('SELECT * FROM routes ORDER BY id');
    res.json({ stats, bookings, messages, routes });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch('/api/admin/bookings/:id', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'paid', 'confirmed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    await pool.query('UPDATE bookings SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/routes', adminOnly, async (req, res) => {
  try {
    const { origin, destination, departure_time, arrival_time, duration, price, class_type, frequency, seats_total } = req.body;
    if (!origin || !destination || !departure_time || !arrival_time || !duration || !price) return res.status(400).json({ message: 'Required route fields are missing' });
    const [r] = await pool.query(`INSERT INTO routes(origin,destination,departure_time,arrival_time,duration,price,class_type,frequency,seats_total)
      VALUES(?,?,?,?,?,?,?,?,?)`, [origin, destination, departure_time, arrival_time, duration, price, class_type || 'Standard', frequency || 'Daily', seats_total || 45]);
    res.status(201).json({ id: r.insertId });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/routes/:id', adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM routes WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: 'Route cannot be removed if it has bookings.' }); }
});

const port = process.env.PORT || 5000;
initDatabase()
  .then(() => app.listen(port, () => console.log(`TicketGuzo API running on http://localhost:${port}`)))
  .catch(err => {
    console.error('TicketGuzo database startup failed:', err.message);
    process.exit(1);
  });
