import { Connection, PublicKey } from '@solana/web3.js';
import { SniperConfigService } from './config/SniperConfigService.js';
import { WalletManager } from './wallet/WalletManager.js';
import { TokenAnalyzer } from './analyzer/TokenAnalyzer.js';
import { PoolMonitor } from './monitor/PoolMonitor.js';
import { TransactionExecutor } from './executor/TransactionExecutor.js';
import { TradingStrategy } from './strategy/TradingStrategy.js';
import { LiquidityPool, BotStats } from './types/index.js';

export class SniperBot {
  private connection: Connection;
  private configService: SniperConfigService;
  private wallet!: WalletManager;
  private analyzer!: TokenAnalyzer;
  private poolMonitor!: PoolMonitor;
  private executor!: TransactionExecutor;
  private strategy!: TradingStrategy;

  private isRunning: boolean = false;
  private startTime?: Date;
  private stats: BotStats = {
    totalTrades: 0,
    successfulTrades: 0,
    failedTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
    activePositions: 0,
    runningTime: 0,
  };

  constructor() {
    this.configService = SniperConfigService.getInstance();
    const config = this.configService.getConfig();

    // Initialize connection
    this.connection = new Connection(config.rpcEndpoint, {
      commitment: 'confirmed',
      wsEndpoint: config.rpcWebsocket,
    });

    console.log('🤖 Solana Memecoin Sniper Bot Initialized');
    console.log(`   RPC: ${config.rpcEndpoint}`);
    console.log(
      `   Mode: ${config.simulationMode ? 'SIMULATION' : 'LIVE TRADING'}`,
    );
  }

  public async start(): Promise<void> {
    console.log('\n🚀 Starting Sniper Bot...');

    const config = this.configService.getConfig();

    // Initialize components
    this.wallet = new WalletManager(this.connection, config.privateKey);
    this.analyzer = new TokenAnalyzer(this.connection);
    this.poolMonitor = new PoolMonitor(this.connection, config);
    this.executor = new TransactionExecutor(
      this.connection,
      this.wallet,
      config,
    );
    this.strategy = new TradingStrategy(config);

    // Display wallet info
    await this.wallet.logBalances();

    // Check minimum balance
    const balance = await this.wallet.getSOLBalance();
    if (!config.simulationMode && balance < config.buyAmount + 0.1) {
      throw new Error(
        `Insufficient balance: ${balance} SOL (need at least ${config.buyAmount + 0.1} SOL)`,
      );
    }

    // Start monitoring
    this.isRunning = true;
    this.startTime = new Date();

    console.log('\n✅ Bot started successfully');
    console.log('   Waiting for new pools...\n');

    // Start pool monitoring
    await this.poolMonitor.startMonitoring(this.onNewPool.bind(this));

    // Start price monitoring for positions
    this.startPriceMonitoring();

    // Start stats logger
    this.startStatsLogger();
  }

  public async stop(): Promise<void> {
    console.log('\n🛑 Stopping Sniper Bot...');

    this.isRunning = false;
    this.poolMonitor.stopMonitoring();

    // Log final stats
    this.logStats();

    // Log all positions
    this.strategy.logAllPositions();

    console.log('\n✅ Bot stopped');
  }

  private async onNewPool(pool: LiquidityPool): Promise<void> {
    console.log('\n🆕 New Pool Detected!');
    console.log(`   Pool: ${pool.address.toBase58()}`);
    console.log(`   DEX: ${pool.dex}`);
    console.log(`   Liquidity: ${pool.liquidity.toFixed(2)} SOL`);

    try {
      // Get token address (not SOL)
      const tokenAddress =
        pool.tokenA.toBase58() ===
        'So11111111111111111111111111111111111111112'
          ? pool.tokenB
          : pool.tokenA;

      // Analyze token
      const analysis = await this.analyzer.analyzeToken(tokenAddress);

      // Evaluate buy signal
      const signal = await this.strategy.evaluateBuySignal(pool, analysis);

      if (!signal) {
        console.log('   ⏭️  No buy signal generated');
        return;
      }

      console.log(`\n🎯 BUY SIGNAL: ${signal.reason}`);
      console.log(`   Priority: ${signal.priority}`);

      // Execute buy
      await this.executeBuy(
        signal.tokenAddress,
        pool.address,
        signal.amount,
      );
    } catch (error) {
      console.error(`\n❌ Error processing pool: ${error}`);
      this.stats.failedTrades++;
    }
  }

  private async executeBuy(
    tokenAddress: PublicKey,
    poolAddress: PublicKey,
    amountInSOL: number,
  ): Promise<void> {
    try {
      // Execute buy transaction
      const signature = await this.executor.buyToken(
        tokenAddress,
        poolAddress,
        amountInSOL,
      );

      this.stats.totalTrades++;
      this.stats.successfulTrades++;

      // Get current price (simplified)
      const price = await this.poolMonitor.getPoolPrice(
        poolAddress,
        tokenAddress,
      );

      // Calculate token amount (simplified)
      const tokenAmount = amountInSOL / price;

      // Add position
      this.strategy.addPosition(
        tokenAddress,
        price,
        tokenAmount,
        amountInSOL,
      );

      this.stats.activePositions = this.strategy.getAllPositions().length;

      console.log(`\n✅ Buy executed successfully!`);
      console.log(`   Signature: ${signature}`);
    } catch (error) {
      console.error(`\n❌ Buy execution failed: ${error}`);
      this.stats.failedTrades++;
      throw error;
    }
  }

  private async executeSell(
    tokenAddress: PublicKey,
    poolAddress: PublicKey,
    amount: number,
  ): Promise<void> {
    try {
      // Execute sell transaction
      const signature = await this.executor.sellToken(
        tokenAddress,
        poolAddress,
        amount,
      );

      this.stats.totalTrades++;
      this.stats.successfulTrades++;

      // Remove position and calculate P/L
      const position = this.strategy.removePosition(tokenAddress);

      if (position) {
        if (position.profitLoss >= 0) {
          this.stats.totalProfit += position.profitLoss;
        } else {
          this.stats.totalLoss += Math.abs(position.profitLoss);
        }
      }

      this.stats.activePositions = this.strategy.getAllPositions().length;
      this.stats.winRate =
        this.stats.totalTrades > 0
          ? (this.stats.successfulTrades / this.stats.totalTrades) * 100
          : 0;

      console.log(`\n✅ Sell executed successfully!`);
      console.log(`   Signature: ${signature}`);
    } catch (error) {
      console.error(`\n❌ Sell execution failed: ${error}`);
      this.stats.failedTrades++;
      throw error;
    }
  }

  private startPriceMonitoring(): void {
    const config = this.configService.getConfig();

    setInterval(async () => {
      if (!this.isRunning) return;

      const positions = this.strategy.getAllPositions();

      for (const position of positions) {
        try {
          // Get current price (would need to implement actual price fetching)
          const currentPrice = position.currentPrice * 1.001; // Placeholder

          // Update position
          this.strategy.updatePositionPrice(
            position.tokenAddress,
            currentPrice,
          );

          // Check sell signal
          const signal = await this.strategy.evaluateSellSignal(
            position.tokenAddress,
            currentPrice,
          );

          if (signal) {
            console.log(`\n🔔 SELL SIGNAL: ${signal.reason}`);

            // Find pool address (would need to track this)
            const poolAddress = new PublicKey(
              '11111111111111111111111111111111',
            ); // Placeholder

            await this.executeSell(
              signal.tokenAddress,
              poolAddress,
              signal.amount,
            );
          }
        } catch (error) {
          console.error(
            `Error monitoring position ${position.tokenAddress.toBase58()}: ${error}`,
          );
        }
      }
    }, config.priceCheckInterval);
  }

  private startStatsLogger(): void {
    setInterval(() => {
      if (!this.isRunning) return;
      this.logStats();
      this.strategy.logAllPositions();
    }, 60000); // Log every minute
  }

  private logStats(): void {
    if (!this.startTime) return;

    this.stats.runningTime = Date.now() - this.startTime.getTime();
    const hours = Math.floor(this.stats.runningTime / (1000 * 60 * 60));
    const minutes = Math.floor(
      (this.stats.runningTime % (1000 * 60 * 60)) / (1000 * 60),
    );

    console.log('\n📊 Bot Statistics:');
    console.log(`   Running Time: ${hours}h ${minutes}m`);
    console.log(`   Total Trades: ${this.stats.totalTrades}`);
    console.log(`   Successful: ${this.stats.successfulTrades}`);
    console.log(`   Failed: ${this.stats.failedTrades}`);
    console.log(`   Win Rate: ${this.stats.winRate.toFixed(2)}%`);
    console.log(`   Total Profit: ${this.stats.totalProfit.toFixed(4)} SOL`);
    console.log(`   Total Loss: ${this.stats.totalLoss.toFixed(4)} SOL`);
    console.log(
      `   Net P/L: ${(this.stats.totalProfit - this.stats.totalLoss).toFixed(4)} SOL`,
    );
    console.log(`   Active Positions: ${this.stats.activePositions}`);
  }
}
