const fs = require('fs');
const os = require('os');
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');

const CONFIG_PATH = path.join(os.homedir(), '.sarvam_config.json');

function getApiKey() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (data.apiKey) return data.apiKey;
    } catch (e) {}
  }
  return null;
}

async function promptApiKey() {
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Sarvam AI API key:',
      mask: '*',
      validate: input => input.length > 0 || 'API key cannot be empty.'
    }
  ]);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2), { mode: 0o600 });
  return apiKey;
}

module.exports = { getApiKey, promptApiKey }; 