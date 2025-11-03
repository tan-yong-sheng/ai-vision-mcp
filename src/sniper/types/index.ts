import { PublicKey } from '@solana/web3.js';

export interface SniperConfig {
  // RPC Configuration
  rpcEndpoint: string;
  rpcWebsocket?: string;

  // Wallet Configuration
  privateKey: string;

  // Trading Configuration
  buyAmount: number; // Amount in SOL to spend per trade
  minLiquidity: number; // Minimum liquidity in SOL
  maxLiquidity: number; // Maximum liquidity in SOL
  takeProfitPercentage: number; // Sell at X% profit
  stopLossPercentage: number; // Sell at X% loss

  // Safety Configuration
  maxSlippage: number; // Maximum slippage percentage
  maxPositionSize: number; // Maximum SOL to invest in a single token
  checkRugPull: boolean; // Enable rug pull checks
  minHolders: number; // Minimum number of holders

  // Monitoring Configuration
  monitorInterval: number; // How often to check for new pools (ms)
  priceCheckInterval: number; // How often to check prices (ms)

  // DEX Configuration
  dexes: ('raydium' | 'orca' | 'jupiter')[]; // DEXes to monitor

  // Simulation Mode
  simulationMode: boolean; // Test without real transactions
}

export interface TokenInfo {
  address: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  mintAuthority: PublicKey | null;
  freezeAuthority: PublicKey | null;
}

export interface LiquidityPool {
  address: PublicKey;
  tokenA: PublicKey;
  tokenB: PublicKey;
  liquidity: number;
  tokenAAmount: number;
  tokenBAmount: number;
  price: number;
  dex: string;
  createdAt: Date;
}

export interface Position {
  tokenAddress: PublicKey;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  solInvested: number;
  profitLoss: number;
  profitLossPercentage: number;
  boughtAt: Date;
}

export interface TradeSignal {
  action: 'buy' | 'sell';
  tokenAddress: PublicKey;
  amount: number;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TokenAnalysis {
  address: PublicKey;
  isRugPull: boolean;
  rugPullScore: number; // 0-100, higher is more risky
  liquidityScore: number; // 0-100, higher is better
  holderScore: number; // 0-100, higher is better
  safetyScore: number; // 0-100, higher is safer
  warnings: string[];
  recommendations: string[];
}

export interface Transaction {
  signature: string;
  type: 'buy' | 'sell';
  tokenAddress: PublicKey;
  amount: number;
  price: number;
  solAmount: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface BotStats {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  activePositions: number;
  runningTime: number;
}
