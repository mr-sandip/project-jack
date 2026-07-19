const mineflayer = require('mineflayer');
const http = require('http');

// 1. Render Keep-Alive Web Server
// Render app ku active rakhiba pain ehi port binding darkar
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Jack Bhaiya is online and running!\n');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});

// 2. Jack Bot Configuration
const botOptions = {
  host: 'mr_sandip.atrnos.me',     // Tora Aternos/Server IP eithi lekha
  port: 62409,                // Tora server port eithi lekha (default 25565)
  username: 'Jack_Bhaiya',    // In-game name
  version: '1.20.1',          // Exact Minecraft version
  auth: 'offline'             // Cracked server pain offline mode true
};

let bot;

function startBot() {
  bot = mineflayer.createBot(botOptions);

  // When Jack enters the server
  bot.on('spawn', () => {
    console.log('Jack Bhaiya server re enter kale!');
    bot.chat('Ram Ram Bhai mane! Jack Bhaiya is here! 😎');
  });

  // Auto-Reconnect Logic (Jadi server down hue ba kick mare)
  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting in 10 seconds...');
    setTimeout(startBot, 10000);
  });

  // Error handling tools
  bot.on('error', (err) => {
    console.log('Error encountered: ', err);
  });
}

// Kickstart Jack
startBot();
