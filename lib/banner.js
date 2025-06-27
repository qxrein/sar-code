const gradient = require('gradient-string');

const blockySarvam = `
███████╗ █████╗ ██████╗ ██╗   ██╗ █████╗ ███╗   ███╗
██╔════╝██╔══██╗██╔══██╗██║   ██║██╔══██╗████╗ ████║
███████╗███████║██████╔╝██║   ██║███████║██╔████╔██║
╚════██║██╔══██║██╔══██╗██║   ██║██╔══██║██║╚██╔╝██║
███████║██║  ██║██║  ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝
`;

const yellow = '\x1b[33m';
const reset = '\x1b[0m';

function drawYellowBorderBox(lines, width = null) {
  if (!width) width = Math.max(...lines.map(l => l.length)) + 4;
  const top = yellow + '╭' + '─'.repeat(width - 2) + '╮' + reset;
  const bottom = yellow + '╰' + '─'.repeat(width - 2) + '╯' + reset;
  const padded = lines.map(l => yellow + '│' + reset + ' ' + l.padEnd(width - 4) + ' ' + yellow + '│' + reset);
  return [top, ...padded, bottom].join('\n');
}

function showBanner() {
  console.log(gradient(['orange', 'black'])(blockySarvam));
  const lines = [
    'Welcome to sarvam — your agentic terminal assistant.',
    '',
    'Type your question or command.',
    '', 
    'For project setup, try /init to create SARVAM.md.',
  ];
  console.log(drawYellowBorderBox(lines, 70));
  console.log();
}

module.exports = { showBanner, drawYellowBorderBox }; 