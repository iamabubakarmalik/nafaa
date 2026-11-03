// App entry: stamps the moment JS starts (startup timing, src/core/perf.ts),
// then hands over to expo-router.
globalThis.__nafaaBootT0 = Date.now();
globalThis.__nafaaMarks = [];

require('expo-router/entry');
