#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const { showBanner, drawYellowBorderBox } = require('../lib/banner');
const { getApiKey, promptApiKey } = require('../lib/config');
const { askSarvam } = require('../lib/sarvamApi');
const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const TRUSTED_MODE = false;

function drawBox(lines, width = null) {
  if (!width) width = Math.max(...lines.map(l => l.length)) + 4;
  const top = '╭' + '─'.repeat(width - 2) + '╮';
  const bottom = '╰' + '─'.repeat(width - 2) + '╯';
  const padded = lines.map(l => '│ ' + l.padEnd(width - 4) + ' │');
  return [top, ...padded, bottom].join('\n');
}

async function trustPrompt() {
  const cwd = process.cwd();
  const trustFile = path.join(cwd, '.sarvam_trusted');
  if (fs.existsSync(trustFile)) {
    return;
  }
  const lines = [
    '',
    'Do you trust the files in this folder?',
    '',
    cwd,
    '',
    'sarvam may read files in this folder. Reading untrusted files may',
    'lead sarvam to behave in unexpected ways.',
    '',
    'With your permission sarvam may execute files in this folder. Executing untrusted code is unsafe.',
    '',
    'https://docs.sarvam.ai/security',
    '',
    '❯ 1. Yes, proceed',
    '  2. No, exit',
    ''
  ];
  console.log(drawBox(lines, 98));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('Enter to confirm · Esc to exit\n', answer => {
      rl.close();
      if (answer.trim() === '2' || answer.trim().toLowerCase() === 'no' || answer.charCodeAt(0) === 27) {
        process.exit(0);
      }
      // Mark this directory as trusted
      fs.writeFileSync(trustFile, 'trusted');
      resolve();
    });
  });
}

function showWelcomeBox() {
  const cwd = process.cwd();
  const lines = [
    '✻ Welcome to sarvam!',
    '',
    '  /help for help, /status for your current setup',
    '',
    `  cwd: ${cwd}`,
  ];
  console.log(drawYellowBorderBox(lines, 57));
  console.log('\n Tips for getting started:\n');
  console.log(' 1. Run /init to create a SARVAM.md file with instructions for sarvam');
  console.log(' 2. Use sarvam to help with file analysis, editing, bash commands and git');
  console.log(' 3. Be as specific as you would with another engineer for the best results\n');
  console.log(drawYellowBorderBox(['> Try "how do I log an error?"'], 50));
  console.log('  ? for shortcuts\n');
}

let apiUsage = { requests: 0, tokens: 0 };

// Main CLI loop for sarvam.
async function main() {
  await trustPrompt();
  showWelcomeBox();
  showBanner();
  console.log(drawYellowBorderBox(['> Try "how do I log an error?"'], 50));
  console.log('  ? for shortcuts\n');
  let apiKey = process.env.SARVAM_API_KEY;
  if (apiKey) {
    console.log('Using API key from SARVAM_API_KEY environment variable.');
  } else {
    apiKey = getApiKey();
    if (!apiKey) {
      apiKey = await promptApiKey();
      console.log('API key saved!');
      console.log('If you do not have an API key, you can get one at: https://dashboard.sarvam.ai/key-management');
    }
  }
  let currentCwd = process.cwd();

  while (true) {
    const { userInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'userInput',
        message: 'Ask sarvam:',
      }
    ]);
    if (userInput.trim().toLowerCase() === 'exit') {
      console.log('Goodbye!');
      process.exit(0);
    }
    // Handle slash commands
    if (userInput.trim().startsWith('/')) {
      const cmd = userInput.trim().toLowerCase();
      if (cmd === '/init') {
        const sarvamPath = path.join(currentCwd, 'SARVAM.md');
        if (!fs.existsSync(sarvamPath)) {
          fs.writeFileSync(sarvamPath, '# SARVAM Project\n\nWelcome to your Sarvam project!\n\nDescribe your project and instructions for sarvam here.');
          console.log('Created SARVAM.md in this directory.');
        } else {
          console.log('SARVAM.md already exists.');
        }
        continue;
      }
      if (cmd === '/help') {
        console.log(drawYellowBorderBox([
          'sarvam CLI commands:',
          '',
          '/init   - Create SARVAM.md with project instructions',
          '/help   - Show this help message',
          '/status - Show current status and API usage',
          'exit    - Quit the CLI',
          '',
          'Type your question or command to use Sarvam AI.'
        ], 57));
        continue;
      }
      if (cmd === '/status') {
        const apiKeyStatus = apiKey ? (apiKey.length > 8 ? apiKey.slice(0, 4) + '...' + apiKey.slice(-4) : 'set') : 'not set';
        console.log(drawYellowBorderBox([
          'sarvam status:',
          '',
          `cwd: ${currentCwd}`,
          `API key: ${apiKeyStatus}`,
          `API requests: ${apiUsage.requests}`,
          `API tokens used: ${apiUsage.tokens}`,
          '',
          'For real-time usage, visit: https://dashboard.sarvam.ai/key-management'
        ], 57));
        continue;
      }
      console.log('Unknown command. Type /help for help.');
      continue;
    }
    let setupCommand = null;
    if (typeof userInput === 'string') {
      const setupCmdRegex = /```(?:bash|sh)?\n(npx create-react-app [^\n]+)\n```|^(npx create-react-app [^\n]+)$/m;
      const setupMatch = userInput.match(setupCmdRegex);
      if (setupMatch) {
        setupCommand = setupMatch[1] || setupMatch[2];
      }
    }

    let projectDir = null;
    const treeDirMatch = userInput.match(/([\w\-_]+)\/[\n\r]/);
    if (treeDirMatch) {
      projectDir = treeDirMatch[1];
    }
    if (!projectDir && setupCommand) {
      const setupDirMatch = setupCommand.match(/npx create-react-app\s+([\w\-_]+)/);
      if (setupDirMatch) {
        projectDir = setupDirMatch[1];
      }
    }
    if (projectDir && projectDir !== '.' && currentCwd !== path.join(process.cwd(), projectDir)) {
      const fullProjectPath = path.join(currentCwd, projectDir);
      if (!fs.existsSync(fullProjectPath)) {
        fs.mkdirSync(fullProjectPath);
        console.log(`Created project directory: ${fullProjectPath}`);
      }
      currentCwd = fullProjectPath;
      console.log(`Switched to project directory: ${currentCwd}`);
    }

    function getDirectorySummary(dir) {
      let summary = 'Project directory tree (top-level only):\n';
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        summary += (item.isDirectory() ? item.name + '/' : item.name) + '\n';
      }
      const readmePath = path.join(dir, 'README.md');
      if (fs.existsSync(readmePath)) {
        summary += '\nREADME.md (first 300 chars):\n' + fs.readFileSync(readmePath, 'utf8').slice(0, 300) + '\n';
      }
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        summary += '\npackage.json (first 300 chars):\n' + fs.readFileSync(pkgPath, 'utf8').slice(0, 300) + '\n';
      }
      return summary;
    }

    // Only enrich the prompt with directory summary if the question needs project context
    const projectContextKeywords = /\b(project|file|directory|structure|code|run|start|build|setup|create|modify|fix|update|readme|package|dependencies|install|configure)\b/i;
    const needsProjectContext = projectContextKeywords.test(userInput) || 
                               /how to run|how do i run|run this project|start this project|launch this project/i.test(userInput);
    
    let enrichedPrompt = userInput;
    if (needsProjectContext) {
      enrichedPrompt += '\n\n' + getDirectorySummary(currentCwd);
    }
    
    if (enrichedPrompt.length > 4000) {
      console.log('Warning: The prompt is large (', enrichedPrompt.length, 'chars).');
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'The prompt is large and may be rejected by the API. Proceed anyway?',
          default: false,
        }
      ]);
      if (!proceed) {
        console.log('Prompt not sent. Please reduce project size or simplify your request.');
        continue;
      }
    }

    const sarvamResponse = await askSarvam(apiKey, enrichedPrompt);
    if (sarvamResponse && sarvamResponse.usage) {
      apiUsage.requests++;
      apiUsage.tokens += sarvamResponse.usage.total_tokens || 0;
    } else {
      apiUsage.requests++;
    }
    console.log(sarvamResponse);
    // console.log(`(sarvam API usage: ${apiUsage.requests} requests, ${apiUsage.tokens} tokens)`);

    // Only create directory structure if no setup command was run
    if (!setupCommand) {
      const treeMatch = sarvamResponse.match(/([\w\-/]+\/)\n([\s\S]*?)(?=\n\n|$)/);
      if (treeMatch) {
        const rootDir = treeMatch[1].replace(/\/$/, '');
        const treeLines = treeMatch[2].split('\n').map(l => l.trim());
        let currentDirs = [rootDir];
        if (!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);
        treeLines.forEach(line => {
          const depth = (line.match(/^(\||├|└|─| )+/) || [''])[0].replace(/[^│├└─ ]/g, '').length;
          // Clean up the name: remove tree characters, comments, extra spaces, and invalid characters
          let name = line.replace(/^(\||├|└|─| )+/, '').trim();
          // Remove comments (anything after #)
          name = name.replace(/#.*$/, '').trim();
          // Remove parentheses content
          name = name.replace(/\(.*?\)/g, '').trim();
          // Remove invalid characters for directory names
          name = name.replace(/[<>:"|?*\x00-\x1f]/g, '').trim();
          // Remove leading/trailing spaces and dots
          name = name.replace(/^[.\s]+|[.\s]+$/g, '');
          
          if (!name || name.length === 0) return;
          
          currentDirs = currentDirs.slice(0, depth + 1);
          const parent = currentDirs[currentDirs.length - 1];
          const fullPath = parent + '/' + name;
          if (name.includes('.')) {
            if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, '');
          } else {
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
            currentDirs.push(fullPath);
          }
        });
        console.log('Directory structure created.');
      }
    }

    // Only consider code blocks for file overwrite if they look like full files or the user asked for file manipulation
    const fileActionKeywords = /\b(create|update|write|fix|replace|edit|overwrite)\b|\.\w{1,6}/i;
    const userIntent = fileActionKeywords.test(userInput) || fileActionKeywords.test(sarvamResponse);

    // Track processed filenames to avoid duplicate prompts
    const processedFiles = new Set();

    const genericBlocksAll = [...sarvamResponse.matchAll(/```(?:[\w\s=\.]*)?\n([\s\S]*?)```/g)];
    for (const block of genericBlocksAll) {
      const code = block[1].trim();
      // Heuristics for default filename suggestion
      let defaultName = '';
      if (code.startsWith('#')) defaultName = 'README.md';
      else if (code.startsWith('{')) defaultName = 'package.json';
      else if (code.startsWith('<!DOCTYPE html>') || code.startsWith('<html')) defaultName = 'index.html';
      else if (code.startsWith('import') || code.startsWith('export') || code.includes('React')) defaultName = 'index.js';

      // Only prompt if user intent is file manipulation or code block is large
      if (userIntent || code.length > 200 || code.split('\n').length > 10) {
        const { confirm, filename } = await inquirer.prompt([
          {
            type: 'input',
            name: 'filename',
            message: 'Detected possible file content. Enter filename to overwrite (leave blank to skip):',
            default: defaultName,
          },
          {
            type: 'confirm',
            name: 'confirm',
            message: answers => answers.filename ? `Overwrite ${answers.filename} with this content?` : 'Skip?',
            default: false,
            when: answers => !!answers.filename,
          }
        ]);
        if (confirm && filename && !processedFiles.has(filename)) {
          processedFiles.add(filename);
          fs.mkdirSync(path.join(currentCwd, path.dirname(filename)), { recursive: true });
          fs.writeFileSync(path.join(currentCwd, filename), code);
          console.log(`Wrote code to ${filename}`);
        }
      }
    }

    const shellCommands = [
      'mkdir', 'ls', 'find', 'cat', 'echo', 'touch', 'cp', 'mv', 'rm', 'npx', 'node', 'npm', 'yarn', 'python', 'pip', 'cargo', 'nu', 'bash', 'sh', 'cd', 'dir', 'copy', 'del', 'type', 'cls', 'move', 'rmdir', 'powershell'
    ];
    let commandsToRun = [];

    if (typeof sarvamResponse === 'string') {
      // Extract from code blocks
      const codeBlocks = [...sarvamResponse.matchAll(/```(?:bash|sh|zsh)?\\n([\\s\\S]*?)```/g)];
      for (const block of codeBlocks) {
        const lines = block[1].split('\\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (shellCommands.some(cmd => line.startsWith(cmd + ' '))) {
            commandsToRun.push(line);
          }
        }
      }
      const lines = sarvamResponse.split('\\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (shellCommands.some(cmd => trimmed.startsWith(cmd + ' '))) {
          commandsToRun.push(trimmed);
        }
      }
    }

    // Remove duplicates and keep order
    commandsToRun = [...new Set(commandsToRun)];

    // Execute all commands sequentially
    for (const commandToRun of commandsToRun) {
      if (commandToRun.startsWith('cd ')) {
        const newDir = commandToRun.slice(3).trim();
        currentCwd = path.isAbsolute(newDir) ? newDir : path.join(currentCwd, newDir);
        console.log(`Changed directory to: ${currentCwd}`);
        continue;
      }
      if (!TRUSTED_MODE) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Run this command? ${commandToRun}`,
            default: false,
          }
        ]);
        if (!confirm) {
          console.log('Command not run.');
          continue;
        }
      } else {
        console.log(`[Trusted mode] Running: ${commandToRun}`);
      }
      await new Promise((resolve) => {
        exec(commandToRun, { cwd: currentCwd }, (error, stdout, stderr) => {
          if (error) {
            console.log(`Error: ${error.message}`);
          }
          if (stdout) {
            console.log(`Output:\\n${stdout}`);
          }
          if (stderr) {
            console.log(`Error output:\\n${stderr}`);
          }
          resolve();
        });
      });
    }
  }
}

main(); 