const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({testDir:'./tests', workers:1, use:{baseURL:'http://127.0.0.1:8765',browserName:'chromium',channel:'chromium'},webServer:{command:'python3 tests/serve.py',url:'http://127.0.0.1:8765',reuseExistingServer:false}});
