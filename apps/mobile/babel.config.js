module.exports = function (api) {
  api.cache(true);
  return {
    // Resolved through expo, which depends on it: works with both the hoisted
    // and the isolated pnpm layout (babel-preset-expo is not a direct dependency).
    presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] })],
    plugins: [
      // Binds t()/Trans to the file's catalog area (scripts/i18n/babel-area-plugin.js).
      './scripts/i18n/babel-area-plugin.js',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};
