const rateLimit = require('express-rate-limit');

const bidLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1 // limit each IP to 1 request per second
});

module.exports = { bidLimiter };
