import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { WalletManager } from '../wallet/WalletManager.js';
import { SniperConfig, Transaction as TradeTransaction } from '../types/index.js';

export class TransactionExecutor {
  private connection: Connection;
  private wallet: WalletManager;
  private config: SniperConfig;
  private transactions: Map<string, TradeTransaction> = new Map();

  constructor(
    connection: Connection,
    wallet: WalletManager,
    config: SniperConfig,
  ) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
  }

  public async buyToken(
    tokenAddress: PublicKey,
    poolAddress: PublicKey,
    amountInSOL: number,
  ): Promise<string> {
    console.log(`\n💰 Executing BUY transaction...`);
    console.log(`   Token: ${tokenAddress.toBase58()}`);
    console.log(`   Amount: ${amountInSOL} SOL`);

    if (this.config.simulationMode) {
      console.log('   🎮 SIMULATION MODE - No real transaction');
      const simulatedSig = `SIM_${Date.now()}_BUY`;
      this.recordTransaction({
        signature: simulatedSig,
        type: 'buy',
        tokenAddress,
        amount: amountInSOL * 1000000, // Simulated token amount
        price: 0.0000001,
        solAmount: amountInSOL,
        timestamp: new Date(),
        status: 'confirmed',
      });
      return simulatedSig;
    }

    try {
      // Check SOL balance
      const solBalance = await this.wallet.getSOLBalance();
      if (solBalance < amountInSOL + 0.01) {
        // +0.01 for fees
        throw new Error(
          `Insufficient SOL balance: ${solBalance} SOL (need ${amountInSOL + 0.01})`,
        );
      }

      // Create or get token account
      const tokenAccount = await this.getOrCreateTokenAccount(tokenAddress);

      // Build swap transaction (simplified - would use Raydium/Jupiter SDK)
      const transaction = await this.buildSwapTransaction(
        poolAddress,
        SOL_MINT,
        tokenAddress,
        amountInSOL,
        'buy',
      );

      // Send transaction with retry
      const signature = await this.sendTransactionWithRetry(transaction);

      console.log(`   ✅ Buy transaction sent: ${signature}`);

      // Record transaction
      this.recordTransaction({
        signature,
        type: 'buy',
        tokenAddress,
        amount: 0, // Would be filled after confirmation
        price: 0,
        solAmount: amountInSOL,
        timestamp: new Date(),
        status: 'pending',
      });

      // Wait for confirmation
      await this.confirmTransaction(signature);

      return signature;
    } catch (error) {
      console.error(`❌ Buy transaction failed: ${error}`);
      throw error;
    }
  }

  public async sellToken(
    tokenAddress: PublicKey,
    poolAddress: PublicKey,
    amount: number,
  ): Promise<string> {
    console.log(`\n💸 Executing SELL transaction...`);
    console.log(`   Token: ${tokenAddress.toBase58()}`);
    console.log(`   Amount: ${amount}`);

    if (this.config.simulationMode) {
      console.log('   🎮 SIMULATION MODE - No real transaction');
      const simulatedSig = `SIM_${Date.now()}_SELL`;
      this.recordTransaction({
        signature: simulatedSig,
        type: 'sell',
        tokenAddress,
        amount,
        price: 0.0000002,
        solAmount: amount * 0.0000002,
        timestamp: new Date(),
        status: 'confirmed',
      });
      return simulatedSig;
    }

    try {
      // Check token balance
      const balance = await this.wallet.getTokenBalance(tokenAddress);
      if (balance < amount) {
        throw new Error(
          `Insufficient token balance: ${balance} (need ${amount})`,
        );
      }

      // Build swap transaction
      const transaction = await this.buildSwapTransaction(
        poolAddress,
        tokenAddress,
        SOL_MINT,
        amount,
        'sell',
      );

      // Send transaction with retry
      const signature = await this.sendTransactionWithRetry(transaction);

      console.log(`   ✅ Sell transaction sent: ${signature}`);

      // Record transaction
      this.recordTransaction({
        signature,
        type: 'sell',
        tokenAddress,
        amount,
        price: 0,
        solAmount: 0,
        timestamp: new Date(),
        status: 'pending',
      });

      // Wait for confirmation
      await this.confirmTransaction(signature);

      return signature;
    } catch (error) {
      console.error(`❌ Sell transaction failed: ${error}`);
      throw error;
    }
  }

  private async buildSwapTransaction(
    poolAddress: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: number,
    type: 'buy' | 'sell',
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Add compute budget instruction for priority fees
    const computeUnitPrice = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 100000, // Adjust for faster execution
    });
    transaction.add(computeUnitPrice);

    const computeUnitLimit = ComputeBudgetProgram.setComputeUnitLimit({
      units: 200000,
    });
    transaction.add(computeUnitLimit);

    // NOTE: This is a placeholder. In a real implementation, you would use:
    // 1. Raydium SDK to build the swap instruction
    // 2. Jupiter Aggregator API for best prices
    // Example with Jupiter:
    // const jupiterQuote = await getJupiterQuote(inputMint, outputMint, amount);
    // const jupiterSwap = await buildJupiterSwap(jupiterQuote);
    // transaction.add(jupiterSwap);

    console.log('   ⚠️  Swap instruction building not fully implemented');
    console.log('   ℹ️  Use Jupiter API or Raydium SDK in production');

    return transaction;
  }

  private async getOrCreateTokenAccount(
    tokenAddress: PublicKey,
  ): Promise<PublicKey> {
    const ata = await getAssociatedTokenAddress(
      tokenAddress,
      this.wallet.getPublicKey(),
    );

    const exists = await this.wallet.hasTokenAccount(tokenAddress);

    if (!exists) {
      console.log('   📝 Creating token account...');
      const transaction = new Transaction();
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.getPublicKey(),
          ata,
          this.wallet.getPublicKey(),
          tokenAddress,
        ),
      );

      const signature = await this.sendTransactionWithRetry(transaction);
      await this.confirmTransaction(signature);
      console.log('   ✅ Token account created');
    }

    return ata;
  }

  private async sendTransactionWithRetry(
    transaction: Transaction,
    maxRetries: number = 3,
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash('finalized');

        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.wallet.getPublicKey();

        // Sign the transaction
        transaction.sign(this.wallet.getKeypair());

        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: false,
            maxRetries: 2,
          },
        );

        return signature;
      } catch (error) {
        console.error(`   Attempt ${i + 1}/${maxRetries} failed: ${error}`);
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Transaction failed after all retries');
  }

  private async confirmTransaction(signature: string): Promise<void> {
    console.log('   ⏳ Waiting for confirmation...');
    const confirmation = await this.connection.confirmTransaction(
      signature,
      'confirmed',
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    console.log('   ✅ Transaction confirmed');

    // Update transaction status
    const tx = this.transactions.get(signature);
    if (tx) {
      tx.status = 'confirmed';
      this.transactions.set(signature, tx);
    }
  }

  private recordTransaction(transaction: TradeTransaction): void {
    this.transactions.set(transaction.signature, transaction);
  }

  public getTransaction(signature: string): TradeTransaction | undefined {
    return this.transactions.get(signature);
  }

  public getAllTransactions(): TradeTransaction[] {
    return Array.from(this.transactions.values());
  }
}

// SOL mint constant
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
