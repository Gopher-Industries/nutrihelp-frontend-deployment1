// Patches Node.js 17+ OpenSSL 3.x incompatibility with webpack 5's md4 hashing.
// CRA 5 uses md4 which was removed from OpenSSL 3.x default provider.
const crypto = require('crypto');
const originalCreateHash = crypto.createHash;
crypto.createHash = (algorithm, ...args) =>
  originalCreateHash(algorithm === 'md4' ? 'sha256' : algorithm, ...args);
