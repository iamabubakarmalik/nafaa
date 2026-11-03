module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
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
