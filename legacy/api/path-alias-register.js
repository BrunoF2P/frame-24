const path = require('path');
const Module = require('module');

const DIST_DIR = path.join(__dirname, 'dist');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('src/')) {
    const relativePath = request.slice(4);
    const newRequest = path.join(DIST_DIR, relativePath);
    return originalResolveFilename(newRequest, parent, ...rest);
  }
  return originalResolveFilename(request, parent, ...rest);
};
