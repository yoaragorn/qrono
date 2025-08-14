const jwt = require('jsonwebtoken');
require('dotenv').config();

// This is our middleware function
function auth(req, res, next) {
  // 1. Get the token from the request header
  // We'll look for it in a custom header named 'x-auth-token'
  const token = req.header('x-auth-token');

  // 2. Check if a token does NOT exist
  if (!token) {
    // If there's no token, deny access with a 401 Unauthorized status
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. If a token exists, we need to verify it
  try {
    // jwt.verify() will decode and validate the token.
    // If it's invalid or expired, it will throw an error, which will be caught by the catch block.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If the token is valid, the 'decoded' variable will contain the payload we created during login.
    // We attach the user object from the payload to the request object.
    req.user = decoded.user;
    
    // Call next() to pass control to the next middleware function or the final route handler.
    // If we don't call next(), the request will be left hanging.
    next();
  } catch (err) {
    // If jwt.verify() throws an error, it means the token is not valid.
    res.status(401).json({ msg: 'Token is not valid' });
  }
}

module.exports = auth;