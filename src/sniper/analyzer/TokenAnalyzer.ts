import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { TokenAnalysis, TokenInfo } from '../types/index.js';

export class TokenAnalyzer {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  public async analyzeToken(
    tokenAddress: PublicKey,
  ): Promise<TokenAnalysis> {
    console.log(`🔍 Analyzing token: ${tokenAddress.toBase58()}`);

    const warnings: string[] = [];
    const recommendations: string[] = [];
    let rugPullScore = 0;

    try {
      // Get mint info
      const mintInfo = await getMint(this.connection, tokenAddress);

      // Check 1: Mint authority
      if (mintInfo.mintAuthority !== null) {
        warnings.push('⚠️  Mint authority is not renounced - tokens can be minted');
        rugPullScore += 30;
      } else {
        recommendations.push('✅ Mint authority renounced');
      }

      // Check 2: Freeze authority
      if (mintInfo.freezeAuthority !== null) {
        warnings.push('⚠️  Freeze authority exists - accounts can be frozen');
        rugPullScore += 25;
      } else {
        recommendations.push('✅ Freeze authority renounced');
      }

      // Check 3: Supply
      const supply = Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals);
      if (supply < 1000000) {
        warnings.push('⚠️  Low token supply - might indicate test token');
        rugPullScore += 10;
      }

      // Check 4: Get top holders (simplified - would need additional API)
      const holderScore = await this.checkHolderDistribution(tokenAddress);

      // Check 5: Liquidity check (would be done by pool monitor)
      const liquidityScore = 50; // Placeholder - actual implementation would check pool

      // Calculate safety score
      const safetyScore = Math.max(0, 100 - rugPullScore);

      const analysis: TokenAnalysis = {
        address: tokenAddress,
        isRugPull: rugPullScore > 50,
        rugPullScore,
        liquidityScore,
        holderScore,
        safetyScore,
        warnings,
        recommendations,
      };

      this.logAnalysis(analysis);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze token: ${error}`);
    }
  }

  private async checkHolderDistribution(
    tokenAddress: PublicKey,
  ): Promise<number> {
    try {
      // Get largest token accounts
      const accounts = await this.connection.getTokenLargestAccounts(
        tokenAddress,
      );

      if (accounts.value.length === 0) {
        return 0;
      }

      // Calculate top holder concentration
      const totalSupply = accounts.value.reduce(
        (sum, account) => sum + Number(account.amount),
        0,
      );
      const topHolderAmount = Number(accounts.value[0]?.amount || 0);
      const concentration = (topHolderAmount / totalSupply) * 100;

      // Score based on concentration (lower is better)
      if (concentration > 50) {
        return 20; // Very concentrated - risky
      } else if (concentration > 30) {
        return 50; // Moderately concentrated
      } else {
        return 80; // Well distributed
      }
    } catch (error) {
      console.error(`Error checking holder distribution: ${error}`);
      return 50; // Default score on error
    }
  }

  public async getTokenInfo(tokenAddress: PublicKey): Promise<TokenInfo> {
    try {
      const mintInfo = await getMint(this.connection, tokenAddress);

      return {
        address: tokenAddress,
        symbol: 'UNKNOWN', // Would need metadata API
        name: 'UNKNOWN', // Would need metadata API
        decimals: mintInfo.decimals,
        supply: Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals),
        mintAuthority: mintInfo.mintAuthority,
        freezeAuthority: mintInfo.freezeAuthority,
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }

  private logAnalysis(analysis: TokenAnalysis): void {
    console.log(`\n📊 Token Analysis Results:`);
    console.log(`   Safety Score: ${analysis.safetyScore}/100`);
    console.log(`   Rug Pull Score: ${analysis.rugPullScore}/100`);
    console.log(`   Liquidity Score: ${analysis.liquidityScore}/100`);
    console.log(`   Holder Score: ${analysis.holderScore}/100`);

    if (analysis.warnings.length > 0) {
      console.log(`\n   Warnings:`);
      analysis.warnings.forEach((w) => console.log(`   ${w}`));
    }

    if (analysis.recommendations.length > 0) {
      console.log(`\n   Recommendations:`);
      analysis.recommendations.forEach((r) => console.log(`   ${r}`));
    }

    if (analysis.isRugPull) {
      console.log(`\n   🚨 HIGH RUG PULL RISK - NOT RECOMMENDED 🚨`);
    }
  }
}
