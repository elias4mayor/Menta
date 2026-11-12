import config from './playwright.config';
export default { ...config, webServer: { command: 'npx next start --hostname 127.0.0.1 --port 3001', url: 'http://127.0.0.1:3001', timeout: 30000 }, use: { ...config.use, baseURL: 'http://127.0.0.1:3001' } };
