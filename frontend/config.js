// config.js (Local development default). Here to allow CICD to update Base URLS in HTML pages
// NOTE: CI/CD (.github/workflows/deploy.yml) overwrites this entire file on every deploy
// with a generated one-liner. Do not add anything here that needs to survive a deploy —
// put it in authKey.js (or another file) instead.
window.APP_CONFIG = { API_BASE_URL: "http://localhost:3000",
  ENVIRONMENT: 'LOCAL',
  // 🔥 MASTER SWITCH
  USE_MOCK: false
 };

