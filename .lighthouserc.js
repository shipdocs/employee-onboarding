module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/crew',
        'http://localhost:3000/manager/login',
        'http://localhost:3000/admin/login'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1
        },
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false
        }
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 5000 }],
        'max-potential-fid': ['warn', { maxNumericValue: 200 }],
        'errors-in-console': ['error', { maxLength: 0 }],
        'server-response-time': ['warn', { maxNumericValue: 600 }],
        'image-size-responsive': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-rel-preconnect': 'warn',
        'dom-size': ['warn', { maxNumericValue: 1500 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    },
    server: {
      port: 3000,
      command: 'npm run dev'
    }
  }
};
