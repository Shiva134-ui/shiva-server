const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/users.json');
const OWNER_EMAIL = 'sivamadesh.134@gmail.com';

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    return { approved: [], pending: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch(e) {
    return { approved: [], pending: [] };
  }
}

function saveDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function norm(email) {
  return (email || '').toLowerCase().trim();
}

function getRole(email) {
  if (!email) return 'unauthorized';
  const nEmail = norm(email);
  if (nEmail === norm(OWNER_EMAIL)) return 'admin';
  const db = getDb();
  if (db.approved && db.approved.some(e => norm(e) === nEmail)) return 'admin';
  return 'pending';
}

function checkAndRegisterUser(user) {
  if (!user || !user.email) return 'unauthorized';
  const nEmail = norm(user.email);
  if (nEmail === norm(OWNER_EMAIL)) return 'admin';
  
  const db = getDb();
  if (db.approved && db.approved.some(e => norm(e) === nEmail)) return 'admin';
  
  if (!db.pending) db.pending = [];
  if (!db.pending.find(u => norm(u.email) === nEmail)) {
    db.pending.push({ 
      email: nEmail, 
      name: user.name || user.email, 
      uid: user.uid, 
      date: new Date().toISOString() 
    });
    saveDb(db);
  }
  return 'pending';
}

function approveUser(email) {
  if (!email) return;
  const nEmail = norm(email);
  const db = getDb();
  if (!db.approved) db.approved = [];
  if (!db.approved.some(e => norm(e) === nEmail)) db.approved.push(nEmail);
  if (db.pending) db.pending = db.pending.filter(u => norm(u.email) !== nEmail);
  saveDb(db);
}

function rejectUser(email) {
  if (!email) return;
  const nEmail = norm(email);
  const db = getDb();
  if (db.pending) db.pending = db.pending.filter(u => norm(u.email) !== nEmail);
  if (db.approved) db.approved = db.approved.filter(e => norm(e) !== nEmail);
  saveDb(db);
}

function getAllUsers() {
  const db = getDb();
  return {
    owner: OWNER_EMAIL,
    approved: db.approved || [],
    pending: db.pending || []
  };
}

module.exports = {
  getRole,
  checkAndRegisterUser,
  approveUser,
  rejectUser,
  getAllUsers
};
