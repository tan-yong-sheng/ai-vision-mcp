import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { LiquidityPool, SniperConfig } from '../types/index.js';

// Raydium Program IDs
const RAYDIUM_LIQUIDITY_POOL_V4 = new PublicKey(
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
);
const RAYDIUM_AMM_PROGRAM = new PublicKey(
  '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h',
);

// SOL and common token addresses
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

export class PoolMonitor {
  private connection: Connection;
  private config: SniperConfig;
  private monitoredPools: Set<string> = new Set();
  private isMonitoring: boolean = false;

  constructor(connection: Connection, config: SniperConfig) {
    this.connection = connection;
    this.config = config;
  }

  public async startMonitoring(
    onNewPool: (pool: LiquidityPool) => Promise<void>,
  ): Promise<void> {
    console.log('🔍 Starting pool monitoring...');
    console.log(`   Monitoring DEXes: ${this.config.dexes.join(', ')}`);
    console.log(
      `   Min Liquidity: ${this.config.minLiquidity} SOL`,
    );
    console.log(
      `   Max Liquidity: ${this.config.maxLiquidity} SOL`,
    );

    this.isMonitoring = true;

    // Monitor Raydium
    if (this.config.dexes.includes('raydium')) {
      this.monitorRaydium(onNewPool);
    }

    console.log('✅ Pool monitoring started');
  }

  public stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('🛑 Pool monitoring stopped');
  }

  private async monitorRaydium(
    onNewPool: (pool: LiquidityPool) => Promise<void>,
  ): Promise<void> {
    console.log('📡 Subscribing to Raydium program logs...');

    try {
      // Subscribe to Raydium program account changes
      this.connection.onLogs(
        RAYDIUM_LIQUIDITY_POOL_V4,
        async (logs, context) => {
          if (!this.isMonitoring) return;

          try {
            // Look for initialize instruction
            if (logs.logs.some((log) => log.includes('initialize'))) {
              console.log('\n🆕 New pool detected!');

              // Parse the transaction to get pool details
              const signature = logs.signature;
              await this.processNewRaydiumPool(signature, onNewPool);
            }
          } catch (error) {
            console.error(`Error processing pool: ${error}`);
          }
        },
        'confirmed',
      );

      console.log('✅ Raydium monitoring active');
    } catch (error) {
      console.error(`Failed to subscribe to Raydium: ${error}`);
    }
  }

  private async processNewRaydiumPool(
    signature: string,
    onNewPool: (pool: LiquidityPool) => Promise<void>,
  ): Promise<void> {
    try {
      // Get transaction details
      const tx = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) {
        return;
      }

      // Extract pool information from transaction
      const accountKeys = tx.transaction.message.getAccountKeys();

      // Find token mints (this is simplified - real implementation needs proper parsing)
      const poolAddress = accountKeys.staticAccountKeys[4]; // Pool address position
      const tokenA = accountKeys.staticAccountKeys[8]; // Token A mint
      const tokenB = accountKeys.staticAccountKeys[9]; // Token B mint

      // Check if already monitored
      const poolKey = poolAddress.toBase58();
      if (this.monitoredPools.has(poolKey)) {
        return;
      }

      // Check if paired with SOL or USDC
      const isPairedWithSOL =
        tokenA.equals(SOL_MINT) || tokenB.equals(SOL_MINT);
      const isPairedWithUSDC =
        tokenA.equals(USDC_MINT) || tokenB.equals(USDC_MINT);

      if (!isPairedWithSOL && !isPairedWithUSDC) {
        console.log('   ⏭️  Skipping - not paired with SOL/USDC');
        return;
      }

      // Get the memecoin address (not SOL/USDC)
      const tokenMint = isPairedWithSOL
        ? tokenA.equals(SOL_MINT)
          ? tokenB
          : tokenA
        : tokenA.equals(USDC_MINT)
          ? tokenB
          : tokenA;

      // Get pool liquidity (simplified)
      const liquidity = await this.getPoolLiquidity(poolAddress);

      // Check liquidity requirements
      if (
        liquidity < this.config.minLiquidity ||
        liquidity > this.config.maxLiquidity
      ) {
        console.log(
          `   ⏭️  Skipping - liquidity ${liquidity.toFixed(2)} SOL out of range`,
        );
        return;
      }

      // Create pool object
      const pool: LiquidityPool = {
        address: poolAddress,
        tokenA,
        tokenB,
        liquidity,
        tokenAAmount: 0, // Would need to fetch actual amounts
        tokenBAmount: 0,
        price: 0, // Would calculate from amounts
        dex: 'raydium',
        createdAt: new Date(),
      };

      // Mark as monitored
      this.monitoredPools.add(poolKey);

      console.log(`\n✨ New qualifying pool found!`);
      console.log(`   Pool: ${poolKey}`);
      console.log(`   Token: ${tokenMint.toBase58()}`);
      console.log(`   Liquidity: ${liquidity.toFixed(2)} SOL`);

      // Notify callback
      await onNewPool(pool);
    } catch (error) {
      console.error(`Error processing Raydium pool: ${error}`);
    }
  }

  private async getPoolLiquidity(poolAddress: PublicKey): Promise<number> {
    try {
      // Get pool account data
      const accountInfo = await this.connection.getAccountInfo(poolAddress);

      if (!accountInfo) {
        return 0;
      }

      // This is simplified - actual implementation would parse the pool state
      // and calculate liquidity from token reserves
      const balance = await this.connection.getBalance(poolAddress);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error(`Error getting pool liquidity: ${error}`);
      return 0;
    }
  }

  public async getPoolPrice(
    poolAddress: PublicKey,
    tokenAddress: PublicKey,
  ): Promise<number> {
    try {
      // Simplified price calculation
      // Real implementation would parse pool reserves and calculate price
      return 0.0000001; // Placeholder
    } catch (error) {
      console.error(`Error getting pool price: ${error}`);
      return 0;
    }
  }
}
