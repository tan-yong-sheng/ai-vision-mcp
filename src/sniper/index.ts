#!/usr/bin/env node

import { SniperBot } from './SniperBot.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('           SOLANA MEMECOIN SNIPER BOT v1.0');
  console.log('═══════════════════════════════════════════════════════════\n');

  const bot = new SniperBot();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n📢 Received shutdown signal...');
    await bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\n📢 Received termination signal...');
    await bot.stop();
    process.exit(0);
  });

  // Handle errors
  process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unhandled rejection:', error);
  });

  process.on('uncaughtException', (error) => {
    console.error('\n❌ Uncaught exception:', error);
    process.exit(1);
  });

  try {
    await bot.start();

    // Keep the bot running
    await new Promise(() => {});
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SniperBot };
