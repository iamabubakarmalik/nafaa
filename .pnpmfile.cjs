/**
 * Prevent pnpm from creating peer dependency symlinks for native modules
 * in workspace packages. The mobile app's node_modules is the single source.
 */
function readPackage(pkg, _context) {
  // For workspace packages with react-native/react peers, downgrade to optional
  // so pnpm doesn't try to create local symlinks.
  if (pkg.name && pkg.name.startsWith('@nafaa/')) {
    if (pkg.peerDependencies) {
      pkg.peerDependenciesMeta = pkg.peerDependenciesMeta || {};
      for (const dep of ['react', 'react-dom', 'react-native']) {
        if (pkg.peerDependencies[dep]) {
          pkg.peerDependenciesMeta[dep] = { optional: true };
        }
      }
    }
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
