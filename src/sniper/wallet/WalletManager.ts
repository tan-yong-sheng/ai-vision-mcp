import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

export class WalletManager {
  private connection: Connection;
  private keypair: Keypair;
  private publicKey: PublicKey;

  constructor(connection: Connection, privateKey: string) {
    this.connection = connection;

    // Parse private key (supports both base58 and array format)
    try {
      if (privateKey.startsWith('[')) {
        const secretKey = Uint8Array.from(JSON.parse(privateKey));
        this.keypair = Keypair.fromSecretKey(secretKey);
      } else {
        const secretKey = bs58.decode(privateKey);
        this.keypair = Keypair.fromSecretKey(secretKey);
      }
    } catch (error) {
      throw new Error(`Failed to parse private key: ${error}`);
    }

    this.publicKey = this.keypair.publicKey;
  }

  public getPublicKey(): PublicKey {
    return this.publicKey;
  }

  public getKeypair(): Keypair {
    return this.keypair;
  }

  public async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      throw new Error(`Failed to get SOL balance: ${error}`);
    }
  }

  public async getTokenBalance(tokenAddress: PublicKey): Promise<number> {
    try {
      const ata = await getAssociatedTokenAddress(
        tokenAddress,
        this.publicKey,
      );

      const account = await getAccount(this.connection, ata);
      return Number(account.amount);
    } catch (error) {
      // Token account doesn't exist or no balance
      return 0;
    }
  }

  public async hasTokenAccount(tokenAddress: PublicKey): Promise<boolean> {
    try {
      const ata = await getAssociatedTokenAddress(
        tokenAddress,
        this.publicKey,
      );
      await getAccount(this.connection, ata);
      return true;
    } catch {
      return false;
    }
  }

  public async getAssociatedTokenAddress(
    tokenAddress: PublicKey,
  ): Promise<PublicKey> {
    return getAssociatedTokenAddress(tokenAddress, this.publicKey);
  }

  public async waitForBalance(
    tokenAddress: PublicKey,
    minAmount: number,
    timeout: number = 30000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const balance = await this.getTokenBalance(tokenAddress);
      if (balance >= minAmount) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  public async logBalances(): Promise<void> {
    const solBalance = await this.getSOLBalance();
    console.log(`\n💰 Wallet: ${this.publicKey.toBase58()}`);
    console.log(`   SOL Balance: ${solBalance.toFixed(4)} SOL`);
  }
}
