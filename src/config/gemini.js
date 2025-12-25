const axios = require('axios');
const config = require('./index');

const geminiClient = axios.create({
  baseURL: config.gemini.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  params: {
    key: config.gemini.apiKey
  }
});

module.exports = geminiClient;
