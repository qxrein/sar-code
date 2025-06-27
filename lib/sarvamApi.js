const axios = require('axios');

const SARVAM_API_URL = 'https://api.sarvam.ai/v1/chat/completions';
const DEFAULT_MODEL = 'sarvam-m';

async function askSarvam(apiKey, prompt) {
  try {
    const payload = {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ],
    };
    const headers = {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    };
    const response = await axios.post(
      SARVAM_API_URL,
      payload,
      { headers }
    );
    const data = response.data;
    if (data.choices && Array.isArray(data.choices) && data.choices[0]?.text) {
      return data.choices[0].text;
    }
    if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (data.result) {
      return data.result;
    }
    if (data.output) {
      return data.output;
    }
    return JSON.stringify(data, null, 2);
  } catch (err) {
    if (err.response && err.response.data) {
      return 'Error: ' + JSON.stringify(err.response.data, null, 2);
    }
    return 'Error: ' + err.message;
  }
}

module.exports = { askSarvam }; 