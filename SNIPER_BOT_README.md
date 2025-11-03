# Solana Memecoin Sniper Bot

An automated trading bot for sniping new memecoin launches on the Solana blockchain. The bot monitors decentralized exchanges (DEXs) for new liquidity pools, analyzes tokens for safety, and executes trades based on configurable strategies.

## 🚨 **DISCLAIMER**

**USE AT YOUR OWN RISK!** This bot is provided for educational purposes. Trading memecoins is highly risky and speculative:

- **High Risk**: You can lose all your invested capital
- **Rug Pulls**: Many new tokens are scams
- **No Guarantees**: Past performance doesn't indicate future results
- **Test First**: Always use SIMULATION_MODE before live trading
- **Not Financial Advice**: This is not financial or investment advice

**The developers are not responsible for any financial losses incurred using this bot.**

## ✨ Features

### Core Functionality
- 🔍 **Real-time Pool Monitoring**: Monitors Raydium (and other DEXs) for new token launches
- 🛡️ **Token Safety Analysis**: Checks for rug pull indicators (mint authority, freeze authority, holder distribution)
- 💰 **Automated Trading**: Executes buy/sell orders based on configurable strategies
- 📊 **Position Management**: Tracks all active positions with P/L calculations
- 🎯 **Take Profit/Stop Loss**: Automatic selling at profit targets or loss limits
- 🎮 **Simulation Mode**: Test strategies without risking real funds

### Safety Features
- Mint authority checks
- Freeze authority checks
- Holder distribution analysis
- Liquidity requirements
- Maximum position size limits
- Slippage protection

## 📋 Requirements

- **Node.js**: v18.0.0 or higher
- **Solana Wallet**: With SOL for trading and gas fees
- **RPC Endpoint**: Solana RPC endpoint (free or paid)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository (if not already done)
git clone https://github.com/tan-yong-sheng/ai-vision-mcp.git
cd ai-vision-mcp

# Install dependencies
npm install
```

### 2. Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# REQUIRED: Solana Configuration
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_wallet_private_key_here

# Trading Parameters
BUY_AMOUNT=0.1                  # Amount in SOL per trade
MIN_LIQUIDITY=10                # Min liquidity in SOL
MAX_LIQUIDITY=1000              # Max liquidity in SOL
TAKE_PROFIT_PERCENTAGE=50       # Sell at 50% profit
STOP_LOSS_PERCENTAGE=30         # Sell at 30% loss

# Safety Settings
MAX_SLIPPAGE=10                 # Max slippage %
MAX_POSITION_SIZE=1             # Max SOL per token
CHECK_RUG_PULL=true            # Enable safety checks
MIN_HOLDERS=50                  # Min token holders

# Simulation Mode (IMPORTANT: Test first!)
SIMULATION_MODE=true            # Set to false for live trading
```

### 3. Get Your Private Key

**⚠️ SECURITY WARNING**: Never share your private key. Use a dedicated trading wallet with limited funds.

Export your wallet's private key:
- **Phantom/Solflare**: Export private key from settings
- **Solana CLI**: `solana-keygen recover` or check `~/.config/solana/id.json`

The bot accepts private keys in two formats:
- **Base58**: `5Kj2m...` (preferred)
- **Array**: `[123,45,67,...]`

### 4. Run the Bot

```bash
# Build and start the bot
npm run sniper

# Or for development (rebuilds on changes)
npm run sniper:dev
```

## 📖 How It Works

### 1. Pool Monitoring
The bot subscribes to Raydium's program logs and detects when new liquidity pools are created. It filters pools based on:
- Paired with SOL or USDC
- Liquidity within configured range
- Not already monitored

### 2. Token Analysis
When a new pool is detected, the bot analyzes the token:
- **Mint Authority**: Check if renounced (safer)
- **Freeze Authority**: Check if renounced (safer)
- **Holder Distribution**: Check concentration (lower is better)
- **Supply**: Validate token supply
- **Safety Score**: Calculate overall safety (0-100)

### 3. Buy Decision
The bot generates a buy signal if:
- Safety score is above threshold (>50)
- No rug pull indicators (if enabled)
- Liquidity is within range
- No existing position in the token

### 4. Position Management
After buying, the bot:
- Tracks entry price and amount
- Monitors price every 2 seconds (configurable)
- Calculates real-time P/L
- Checks take profit and stop loss conditions

### 5. Sell Decision
The bot sells when:
- Price reaches take profit target (e.g., +50%)
- Price hits stop loss limit (e.g., -30%)
- Manual intervention (planned feature)

## ⚙️ Configuration Guide

### Trading Parameters

| Parameter | Description | Default | Recommended |
|-----------|-------------|---------|-------------|
| `BUY_AMOUNT` | SOL to spend per trade | 0.1 | 0.05-0.5 |
| `MIN_LIQUIDITY` | Minimum pool liquidity | 10 SOL | 10-50 SOL |
| `MAX_LIQUIDITY` | Maximum pool liquidity | 1000 SOL | 500-2000 SOL |
| `TAKE_PROFIT_PERCENTAGE` | Profit target | 50% | 30-100% |
| `STOP_LOSS_PERCENTAGE` | Loss limit | 30% | 20-50% |

### Safety Parameters

| Parameter | Description | Default | Recommended |
|-----------|-------------|---------|-------------|
| `MAX_SLIPPAGE` | Max acceptable slippage | 10% | 5-15% |
| `MAX_POSITION_SIZE` | Max SOL per token | 1 SOL | 0.5-2 SOL |
| `CHECK_RUG_PULL` | Enable rug checks | true | true |
| `MIN_HOLDERS` | Min token holders | 50 | 50-100 |

### RPC Configuration

For better performance, use a paid RPC provider:
- **Helius**: https://helius.xyz
- **QuickNode**: https://quicknode.com
- **Alchemy**: https://alchemy.com

Free RPC endpoints have rate limits and may miss new pools.

## 🛠️ Advanced Features

### Custom Trading Strategies

Modify `src/sniper/strategy/TradingStrategy.ts` to implement custom logic:

```typescript
public async evaluateBuySignal(
  pool: LiquidityPool,
  analysis: TokenAnalysis,
): Promise<TradeSignal | null> {
  // Add your custom logic here
  if (analysis.safetyScore < 70) {
    return null; // Skip if safety score too low
  }

  // Your custom conditions...
  return signal;
}
```

### Multiple DEX Support

The bot supports monitoring multiple DEXs:

```env
DEXES=raydium,orca,jupiter
```

Note: Orca and Jupiter support is partially implemented.

### Priority Fees

Adjust compute budget in `src/sniper/executor/TransactionExecutor.ts`:

```typescript
const computeUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 100000, // Increase for faster execution
});
```

## 📊 Monitoring & Logs

The bot provides real-time logging:

```
🔍 Starting pool monitoring...
   Monitoring DEXes: raydium
   Min Liquidity: 10 SOL
   Max Liquidity: 1000 SOL

🆕 New Pool Detected!
   Pool: 7xKXtg2...
   Token: 9aVZqQ...
   Liquidity: 45.23 SOL

🔍 Analyzing token: 9aVZqQ...
   Safety Score: 75/100
   ✅ Mint authority renounced
   ✅ Freeze authority renounced

💰 Executing BUY transaction...
   Token: 9aVZqQ...
   Amount: 0.1 SOL
   ✅ Buy transaction sent: 3Hg7x...

📊 Bot Statistics:
   Running Time: 0h 15m
   Total Trades: 3
   Win Rate: 66.67%
   Net P/L: +0.0234 SOL
   Active Positions: 2
```

## 🐛 Troubleshooting

### Bot Not Detecting Pools

1. **Check RPC connection**: Verify your RPC endpoint is working
2. **Check liquidity range**: Widen MIN_LIQUIDITY and MAX_LIQUIDITY
3. **Check DEX logs**: Ensure Raydium is creating new pools
4. **Use premium RPC**: Free endpoints may have delays

### Transactions Failing

1. **Insufficient balance**: Ensure wallet has enough SOL
2. **Slippage too low**: Increase MAX_SLIPPAGE
3. **Network congestion**: Increase priority fees
4. **Token issues**: Token may have transfer restrictions

### High Rug Pull Scores

This is expected with memecoins! Adjust safety thresholds or disable rug pull checks (not recommended).

## ⚠️ Important Notes

### Swap Implementation

The current implementation includes **placeholder swap logic**. For production use, you MUST implement one of:

1. **Jupiter Aggregator** (recommended for best prices):
   ```typescript
   // Get quote from Jupiter
   const quote = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}`);

   // Build swap transaction
   const swapTransaction = await fetch('https://quote-api.jup.ag/v6/swap', {
     method: 'POST',
     body: JSON.stringify({ /* quote data */ })
   });
   ```

2. **Raydium SDK** (direct DEX integration):
   ```typescript
   import { Liquidity } from '@raydium-io/raydium-sdk';

   // Build Raydium swap instruction
   const swapInstruction = await Liquidity.makeSwapInstruction({
     poolKeys,
     userKeys,
     amountIn,
     minAmountOut
   });
   ```

See `src/sniper/executor/TransactionExecutor.ts:buildSwapTransaction()` for integration points.

### Testing

**ALWAYS** test in simulation mode first:

```env
SIMULATION_MODE=true
```

This will:
- Monitor real pools
- Analyze real tokens
- Simulate trades without transactions
- Track simulated P/L

### Security Best Practices

1. **Use a dedicated wallet** with limited funds
2. **Never commit `.env`** file to version control
3. **Use environment variables** for production
4. **Enable all safety checks** initially
5. **Start with small amounts** (0.05-0.1 SOL)
6. **Monitor the bot** regularly

## 📈 Strategy Optimization

### Conservative Strategy
```env
BUY_AMOUNT=0.05
MIN_LIQUIDITY=50
MAX_LIQUIDITY=500
TAKE_PROFIT_PERCENTAGE=30
STOP_LOSS_PERCENTAGE=20
CHECK_RUG_PULL=true
```

### Aggressive Strategy
```env
BUY_AMOUNT=0.5
MIN_LIQUIDITY=10
MAX_LIQUIDITY=2000
TAKE_PROFIT_PERCENTAGE=100
STOP_LOSS_PERCENTAGE=50
CHECK_RUG_PULL=true
```

### Balanced Strategy
```env
BUY_AMOUNT=0.1
MIN_LIQUIDITY=20
MAX_LIQUIDITY=1000
TAKE_PROFIT_PERCENTAGE=50
STOP_LOSS_PERCENTAGE=30
CHECK_RUG_PULL=true
```

## 🔧 Development

### Project Structure

```
src/sniper/
├── config/           # Configuration management
├── wallet/           # Wallet operations
├── monitor/          # Pool monitoring
├── analyzer/         # Token safety analysis
├── executor/         # Transaction execution
├── strategy/         # Trading strategy
├── types/            # TypeScript definitions
└── index.ts          # Main entry point
```

### Building from Source

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm run sniper
```

### Testing

```bash
# Run in simulation mode
SIMULATION_MODE=true npm run sniper

# Run linter
npm run lint

# Format code
npm run format
```

## 📝 TODO / Future Enhancements

- [ ] Implement Jupiter swap integration
- [ ] Add Orca pool monitoring
- [ ] Add manual buy/sell commands
- [ ] Implement trailing stop loss
- [ ] Add Discord/Telegram notifications
- [ ] Add web dashboard for monitoring
- [ ] Implement backtesting
- [ ] Add database for historical trades
- [ ] Implement multi-wallet support
- [ ] Add advanced rug pull detection (liquidity lock checks, etc.)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- **Solana Foundation** for the blockchain infrastructure
- **Raydium** for the DEX protocol
- **Jupiter** for the swap aggregator
- Community contributors and testers

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review troubleshooting section

---

**Remember**: This bot is a tool. Success depends on market conditions, configuration, and luck. Always do your own research and never invest more than you can afford to lose. 🚀
