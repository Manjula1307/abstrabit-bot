const jwt = require('jsonwebtoken');

// Reads the httpOnly "session" cookie, verifies it, attaches req.userId.
// Never trust anything from the client beyond this verified id.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth };
