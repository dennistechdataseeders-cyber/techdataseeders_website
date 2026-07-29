const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ;

// Hash password
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

function login(username, password) {
  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    const token = jwt.sign(
      { username, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    return { success: true, token };
  }
  return { success: false, message: 'Invalid credentials' };
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  const result = verifyToken(token);
  
  if (!result.success) {
    return res.status(401).json({ success: false, message: result.message });
  }
  
  req.user = result.user;
  next();
}

module.exports = { login, verifyToken, authMiddleware };