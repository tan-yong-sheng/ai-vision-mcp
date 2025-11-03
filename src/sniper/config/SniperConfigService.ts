import { SniperConfig } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class SniperConfigService {
  private static instance: SniperConfigService;
  private config: SniperConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): SniperConfigService {
    if (!SniperConfigService.instance) {
      SniperConfigService.instance = new SniperConfigService();
    }
    return SniperConfigService.instance;
  }

  private loadConfig(): SniperConfig {
    return {
      // RPC Configuration
      rpcEndpoint:
        process.env.SOLANA_RPC_ENDPOINT ||
        'https://api.mainnet-beta.solana.com',
      rpcWebsocket: process.env.SOLANA_RPC_WEBSOCKET,

      // Wallet Configuration
      privateKey: process.env.SOLANA_PRIVATE_KEY || '',

      // Trading Configuration
      buyAmount: parseFloat(process.env.BUY_AMOUNT || '0.1'),
      minLiquidity: parseFloat(process.env.MIN_LIQUIDITY || '10'),
      maxLiquidity: parseFloat(process.env.MAX_LIQUIDITY || '1000'),
      takeProfitPercentage: parseFloat(
        process.env.TAKE_PROFIT_PERCENTAGE || '50',
      ),
      stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '30'),

      // Safety Configuration
      maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '10'),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1'),
      checkRugPull: process.env.CHECK_RUG_PULL !== 'false',
      minHolders: parseInt(process.env.MIN_HOLDERS || '50'),

      // Monitoring Configuration
      monitorInterval: parseInt(process.env.MONITOR_INTERVAL || '5000'),
      priceCheckInterval: parseInt(process.env.PRICE_CHECK_INTERVAL || '2000'),

      // DEX Configuration
      dexes: (process.env.DEXES || 'raydium').split(',') as (
        | 'raydium'
        | 'orca'
        | 'jupiter'
      )[],

      // Simulation Mode
      simulationMode: process.env.SIMULATION_MODE === 'true',
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];

    if (!this.config.privateKey && !this.config.simulationMode) {
      errors.push('SOLANA_PRIVATE_KEY is required when not in simulation mode');
    }

    if (this.config.buyAmount <= 0) {
      errors.push('BUY_AMOUNT must be greater than 0');
    }

    if (this.config.takeProfitPercentage <= 0) {
      errors.push('TAKE_PROFIT_PERCENTAGE must be greater than 0');
    }

    if (this.config.stopLossPercentage <= 0) {
      errors.push('STOP_LOSS_PERCENTAGE must be greater than 0');
    }

    if (this.config.maxSlippage < 0 || this.config.maxSlippage > 100) {
      errors.push('MAX_SLIPPAGE must be between 0 and 100');
    }

    if (errors.length > 0) {
      throw new Error(
        `Configuration validation failed:\n${errors.join('\n')}`,
      );
    }
  }

  public getConfig(): SniperConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SniperConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }
}
