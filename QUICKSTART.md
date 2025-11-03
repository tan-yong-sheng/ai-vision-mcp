# Solana Memecoin Sniper Bot - Quick Start Guide

Get started with the bot in 5 minutes!

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment

Create `.env` file:
```bash
cp .env.example .env
```

**Minimum required configuration** for testing:

```env
# RPC Endpoint (use a good one for better performance)
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com

# Your wallet private key (base58 format)
SOLANA_PRIVATE_KEY=your_base58_private_key_here

# IMPORTANT: Start in simulation mode!
SIMULATION_MODE=true

# Trading settings (adjust as needed)
BUY_AMOUNT=0.1
TAKE_PROFIT_PERCENTAGE=50
STOP_LOSS_PERCENTAGE=30
```

### 3. Get Your Private Key

**⚠️ Use a TEST wallet with small amounts first!**

From Phantom/Solflare:
1. Open wallet settings
2. Select your account
3. Export private key
4. Copy the base58 string

### 4. Run the Bot

```bash
npm run sniper
```

You should see:
```
═══════════════════════════════════════════════════════════
           SOLANA MEMECOIN SNIPER BOT v1.0
═══════════════════════════════════════════════════════════

🤖 Solana Memecoin Sniper Bot Initialized
   RPC: https://api.mainnet-beta.solana.com
   Mode: SIMULATION

🚀 Starting Sniper Bot...

💰 Wallet: YourWalletAddressHere
   SOL Balance: 1.2345 SOL

🔍 Starting pool monitoring...
   Monitoring DEXes: raydium
   Min Liquidity: 10 SOL
   Max Liquidity: 1000 SOL

✅ Bot started successfully
   Waiting for new pools...
```

## 🎯 What Happens Next?

The bot will:
1. ✅ Monitor Raydium for new token launches
2. ✅ Analyze each new token for safety
3. ✅ Simulate trades (no real transactions in simulation mode)
4. ✅ Track simulated positions and P/L
5. ✅ Log all activity to console

## 🧪 Testing in Simulation Mode

**ALWAYS test first!** Simulation mode allows you to:
- See how the bot reacts to new pools
- Test your configuration
- Understand the logging output
- Verify everything works

No real transactions are executed in simulation mode.

## 🚀 Going Live

**Only after thorough testing:**

1. **Use a dedicated wallet** with limited funds
2. **Set simulation mode to false**:
   ```env
   SIMULATION_MODE=false
   ```
3. **Start with small amounts**:
   ```env
   BUY_AMOUNT=0.05
   ```
4. **Monitor closely** for the first hour

## ⚙️ Essential Configuration

### Conservative (Recommended for Beginners)
```env
BUY_AMOUNT=0.05
MIN_LIQUIDITY=50
MAX_LIQUIDITY=500
TAKE_PROFIT_PERCENTAGE=30
STOP_LOSS_PERCENTAGE=20
CHECK_RUG_PULL=true
SIMULATION_MODE=false  # Only after testing!
```

### Balanced (Moderate Risk)
```env
BUY_AMOUNT=0.1
MIN_LIQUIDITY=20
MAX_LIQUIDITY=1000
TAKE_PROFIT_PERCENTAGE=50
STOP_LOSS_PERCENTAGE=30
CHECK_RUG_PULL=true
SIMULATION_MODE=false
```

### Aggressive (High Risk)
```env
BUY_AMOUNT=0.5
MIN_LIQUIDITY=10
MAX_LIQUIDITY=2000
TAKE_PROFIT_PERCENTAGE=100
STOP_LOSS_PERCENTAGE=50
CHECK_RUG_PULL=true
SIMULATION_MODE=false
```

## 🔧 Recommended RPC Providers

For better performance (new pools detected faster):

### Free Tier
- **Helius**: https://helius.xyz (500k credits/month free)
- **QuickNode**: https://quicknode.com (free tier available)

### Paid (Recommended for Live Trading)
- **Helius Pro**: ~$50/month (best for sniping)
- **QuickNode**: ~$49/month
- **Triton**: ~$50/month

Update your `.env`:
```env
SOLANA_RPC_ENDPOINT=https://your-helius-endpoint.com
SOLANA_RPC_WEBSOCKET=wss://your-helius-endpoint.com
```

## 📊 Understanding the Output

### New Pool Detection
```
🆕 New Pool Detected!
   Pool: 7xKXtg2CW3UXejPD14MFoaGkBe9gFk...
   DEX: raydium
   Liquidity: 45.23 SOL
```

### Token Analysis
```
🔍 Analyzing token: 9aVZqQm...
📊 Token Analysis Results:
   Safety Score: 75/100
   Rug Pull Score: 25/100
   ✅ Mint authority renounced
   ✅ Freeze authority renounced
```

### Buy Signal
```
🎯 BUY SIGNAL: New pool with 45.23 SOL liquidity and safety score 75/100
   Priority: high
💰 Executing BUY transaction...
   🎮 SIMULATION MODE - No real transaction
   ✅ Buy transaction sent: SIM_1234_BUY
```

### Position Tracking
```
📊 Position added: 9aVZqQm...
   Entry: 0.00000123
   Current: 0.00000123
   Amount: 1000000.00
   Invested: 0.1000 SOL
   🟢 P/L: 0.0000 SOL (0.00%)
```

## ❓ Common Issues

### "Insufficient balance" error
- Ensure your wallet has enough SOL (BUY_AMOUNT + 0.1 for fees)
- Check you're using the correct private key

### Bot not detecting pools
- New pools are rare - be patient
- Try widening liquidity range (MIN_LIQUIDITY=5, MAX_LIQUIDITY=5000)
- Use a better RPC endpoint
- Raydium may have fewer new pools at certain times

### "Configuration validation failed"
- Check all required environment variables are set
- Verify SOLANA_PRIVATE_KEY is valid
- Ensure numeric values are numbers, not strings

## 🛑 Stopping the Bot

Press `Ctrl+C` to stop the bot gracefully.

It will:
1. Stop monitoring new pools
2. Display final statistics
3. Show all active positions
4. Exit cleanly

## 📚 Next Steps

1. ✅ Test in simulation mode for 1-2 hours
2. ✅ Read the full [SNIPER_BOT_README.md](SNIPER_BOT_README.md)
3. ✅ Understand the risks (see disclaimer)
4. ✅ Start with small amounts
5. ✅ Monitor and adjust strategy

## ⚠️ Important Reminders

- 🚨 **ALWAYS TEST FIRST** in simulation mode
- 💰 **Use a dedicated wallet** with limited funds
- 📊 **Monitor the bot** - don't leave it unattended
- 🛡️ **Enable safety checks** (CHECK_RUG_PULL=true)
- 💡 **Start small** - you can always increase later
- 📖 **Learn continuously** - adjust strategy based on results

## 🔗 Additional Resources

- Full documentation: [SNIPER_BOT_README.md](SNIPER_BOT_README.md)
- Solana docs: https://docs.solana.com
- Raydium docs: https://docs.raydium.io
- Jupiter API: https://docs.jup.ag

---

**Good luck, and trade safely! 🚀**

Remember: This is a high-risk activity. Only invest what you can afford to lose!
