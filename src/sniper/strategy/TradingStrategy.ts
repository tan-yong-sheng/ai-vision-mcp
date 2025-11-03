import { PublicKey } from '@solana/web3.js';
import {
  Position,
  TradeSignal,
  TokenAnalysis,
  SniperConfig,
  LiquidityPool,
} from '../types/index.js';

export class TradingStrategy {
  private config: SniperConfig;
  private positions: Map<string, Position> = new Map();

  constructor(config: SniperConfig) {
    this.config = config;
  }

  public async evaluateBuySignal(
    pool: LiquidityPool,
    analysis: TokenAnalysis,
  ): Promise<TradeSignal | null> {
    console.log('\n📈 Evaluating BUY signal...');

    // Get token address (not SOL)
    const tokenAddress =
      pool.tokenA.toBase58() === 'So11111111111111111111111111111111111111112'
        ? pool.tokenB
        : pool.tokenA;

    // Check if already have position
    if (this.positions.has(tokenAddress.toBase58())) {
      console.log('   ⏭️  Already have position in this token');
      return null;
    }

    // Safety checks
    if (this.config.checkRugPull && analysis.isRugPull) {
      console.log('   ❌ Failed: High rug pull risk');
      return null;
    }

    if (analysis.safetyScore < 50) {
      console.log(
        `   ❌ Failed: Low safety score (${analysis.safetyScore}/100)`,
      );
      return null;
    }

    // Liquidity checks
    if (pool.liquidity < this.config.minLiquidity) {
      console.log('   ❌ Failed: Liquidity too low');
      return null;
    }

    if (pool.liquidity > this.config.maxLiquidity) {
      console.log('   ❌ Failed: Liquidity too high');
      return null;
    }

    // Calculate buy amount
    const buyAmount = Math.min(
      this.config.buyAmount,
      this.config.maxPositionSize,
    );

    console.log('   ✅ BUY signal generated');
    console.log(`   Amount: ${buyAmount} SOL`);

    return {
      action: 'buy',
      tokenAddress,
      amount: buyAmount,
      reason: `New pool detected with ${pool.liquidity.toFixed(2)} SOL liquidity and safety score ${analysis.safetyScore}/100`,
      priority: this.calculatePriority(analysis),
    };
  }

  public async evaluateSellSignal(
    tokenAddress: PublicKey,
    currentPrice: number,
  ): Promise<TradeSignal | null> {
    const position = this.positions.get(tokenAddress.toBase58());

    if (!position) {
      return null;
    }

    // Update current price and P/L
    position.currentPrice = currentPrice;
    position.profitLoss =
      (currentPrice - position.entryPrice) * position.amount;
    position.profitLossPercentage =
      ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

    // Check take profit
    if (
      position.profitLossPercentage >= this.config.takeProfitPercentage
    ) {
      console.log(
        `\n🎯 Take Profit triggered at +${position.profitLossPercentage.toFixed(2)}%`,
      );
      return {
        action: 'sell',
        tokenAddress,
        amount: position.amount,
        reason: `Take profit at ${position.profitLossPercentage.toFixed(2)}% gain`,
        priority: 'high',
      };
    }

    // Check stop loss
    if (
      position.profitLossPercentage <= -this.config.stopLossPercentage
    ) {
      console.log(
        `\n🛑 Stop Loss triggered at ${position.profitLossPercentage.toFixed(2)}%`,
      );
      return {
        action: 'sell',
        tokenAddress,
        amount: position.amount,
        reason: `Stop loss at ${position.profitLossPercentage.toFixed(2)}% loss`,
        priority: 'high',
      };
    }

    return null;
  }

  public addPosition(
    tokenAddress: PublicKey,
    entryPrice: number,
    amount: number,
    solInvested: number,
  ): void {
    const position: Position = {
      tokenAddress,
      entryPrice,
      currentPrice: entryPrice,
      amount,
      solInvested,
      profitLoss: 0,
      profitLossPercentage: 0,
      boughtAt: new Date(),
    };

    this.positions.set(tokenAddress.toBase58(), position);
    console.log(`\n📊 Position added: ${tokenAddress.toBase58()}`);
    this.logPosition(position);
  }

  public removePosition(tokenAddress: PublicKey): Position | undefined {
    const position = this.positions.get(tokenAddress.toBase58());
    this.positions.delete(tokenAddress.toBase58());

    if (position) {
      console.log(`\n📊 Position closed: ${tokenAddress.toBase58()}`);
      this.logPosition(position);
    }

    return position;
  }

  public getPosition(tokenAddress: PublicKey): Position | undefined {
    return this.positions.get(tokenAddress.toBase58());
  }

  public getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  public updatePositionPrice(
    tokenAddress: PublicKey,
    currentPrice: number,
  ): void {
    const position = this.positions.get(tokenAddress.toBase58());
    if (position) {
      position.currentPrice = currentPrice;
      position.profitLoss =
        (currentPrice - position.entryPrice) * position.amount;
      position.profitLossPercentage =
        ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    }
  }

  private calculatePriority(
    analysis: TokenAnalysis,
  ): 'low' | 'medium' | 'high' {
    if (analysis.safetyScore >= 80) return 'high';
    if (analysis.safetyScore >= 60) return 'medium';
    return 'low';
  }

  private logPosition(position: Position): void {
    const profitColor = position.profitLoss >= 0 ? '🟢' : '🔴';
    console.log(`   Token: ${position.tokenAddress.toBase58()}`);
    console.log(`   Entry: ${position.entryPrice.toFixed(8)}`);
    console.log(`   Current: ${position.currentPrice.toFixed(8)}`);
    console.log(`   Amount: ${position.amount.toFixed(2)}`);
    console.log(`   Invested: ${position.solInvested.toFixed(4)} SOL`);
    console.log(
      `   ${profitColor} P/L: ${position.profitLoss.toFixed(4)} SOL (${position.profitLossPercentage.toFixed(2)}%)`,
    );
  }

  public logAllPositions(): void {
    const positions = this.getAllPositions();

    if (positions.length === 0) {
      console.log('\n📊 No active positions');
      return;
    }

    console.log(`\n📊 Active Positions (${positions.length}):`);
    positions.forEach((position) => {
      console.log(`\n   ${position.tokenAddress.toBase58()}`);
      this.logPosition(position);
    });
  }
}
