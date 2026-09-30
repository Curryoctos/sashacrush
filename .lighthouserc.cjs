module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: ['http://127.0.0.1:4173/login'],
      settings: {
        preset: 'perf',
        formFactor: 'mobile',
        throttlingMethod: 'simulate',
        // Default LH mobile simulation ≈ slow 4G; tighten toward 3G for C-29.
        throttling: {
          rttMs: 150,
          throughputKbps: 1.6 * 1024,
          requestLatencyMs: 150,
          downloadThroughputKbps: 1.6 * 1024,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4,
        },
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          disabled: false,
        },
        onlyCategories: ['performance', 'pwa'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.7 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'installable-manifest': 'warn',
        'service-worker': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
