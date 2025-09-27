import { SmartContract, Args, parseMas, OperationStatus, bytesToStr, MRC20 } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { TokenWithPercentage } from './types';

// Get contract instance
function getFactoryContract(connectedAccount: any): SmartContract {
  if (!connectedAccount) throw new Error("Missing connected account");
  
  const contractAddress = import.meta.env.VITE_SMART_CONTRACT as string;
  if (!contractAddress) {
    throw new Error('Smart contract address not found in environment variables');
  }
  
  return new SmartContract(connectedAccount, contractAddress);
}

// Create a new splitter vault
export async function createSplitterVault(
  connectedAccount: any,
  tokensWithPercentage: TokenWithPercentage[],
  initialCoins: string = '0.1'
): Promise<{ success: boolean; vaultAddress?: string; error?: string }> {
  const toastId = toast.loading('Creating splitter vault...');
  
  try {
    console.log('Creating splitter vault...');

    const contract = getFactoryContract(connectedAccount);

    const args = new Args()
      .addSerializableObjectArray(tokensWithPercentage)
      .addU64(parseMas(initialCoins))
      .serialize();

    // Call the smart contract function
    const operation = await contract.call('createSplitterVault', args, {
      coins: parseMas('5'), // Operation fee
    });

    console.log(`Operation ID: ${operation.id}`);
    toast.update(toastId, {
      render: 'Waiting for transaction confirmation...',
      isLoading: true
    });

    // Wait for the operation to be executed
    const status = await operation.waitSpeculativeExecution();

    if (status === OperationStatus.SpeculativeSuccess) {
      console.log('Splitter vault created successfully');
      
      // Get events to extract vault address
      const events = await operation.getSpeculativeEvents();
      let vaultAddress = '';
      
      for (const event of events) {
        if (event.data && event.data.includes('CREATE_SPLITTER_VAULT')) {
          // Extract vault address from event data
          const eventParts = event.data.split(',');
          if (eventParts.length > 0) {
            vaultAddress = eventParts[0].replace('CREATE_SPLITTER_VAULT:', '').trim();
          }
          break;
        }
      }

      // Try to wait for final execution to ensure storage is available
      try {
        console.log('Waiting for final execution...');
        const finalStatus = await operation.waitFinalExecution();
        console.log('Final execution status:', finalStatus);
      } catch (error) {
        console.log('Final execution wait failed, but continuing:', error);
      }
      
      toast.update(toastId, {
        render: '🎉 Vault created successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: true, vaultAddress };
    } else {
      console.log('Status:', status);
      const spec_events = await operation.getSpeculativeEvents();
      console.log('Speculative events:', spec_events);
      
      toast.update(toastId, {
        render: 'Failed to create vault',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: false, error: 'Failed to create splitter vault' };
    }
  } catch (error) {
    console.error('Error creating splitter vault:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    toast.update(toastId, {
      render: `Error: ${errorMessage}`,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
    });
    
    return { success: false, error: errorMessage };
  }
}

// Get user's splitter vaults
export async function getUserSplitterVaults(
  connectedAccount: any,
  userAddress: string
): Promise<string[]> {
  try {
    const contract = getFactoryContract(connectedAccount);
    
    console.log('Fetching vaults for user:', userAddress);
    console.log('Contract address:', contract.address);
    
    // Use the connected account's provider to ensure we're querying the right network
    // const provider = connectedAccount.provider || Web3Provider.mainnet();
    
    const storagePrefix = 'SPL:' + userAddress + ':';
    console.log('Storage prefix:', storagePrefix);
    
    const keys = await connectedAccount.getStorageKeys(
      contract.address,
      storagePrefix,
      false,
    );

    console.log('Raw storage keys found:', keys.length);

    const splitterVaults = [];

    for (const key of keys) {
      console.log('Raw key:', key);
      const deserializedKey = bytesToStr(key);
      console.log('Deserialized key:', deserializedKey);
      
      // The key format is "SPL:<user_address>:<vault_address>"
      // We can split the string by ':' and take the last part as the vault address
      const parts = deserializedKey.split(':');
      if (parts.length === 3) {
        const vaultAddress = parts[2];
        console.log('Found vault address:', vaultAddress);
        splitterVaults.push(vaultAddress);
      } else {
        console.warn(`Unexpected key format: ${deserializedKey}`);
      }
    }

    console.log(
      `Found ${splitterVaults.length} splitter vault(s) for user ${userAddress}`,
    );

    console.log('splitter vaults',splitterVaults)

    return splitterVaults;
  } catch (error) {
    console.error('Error fetching user vaults:', error);
    return [];
  }
}

// Deposit to a splitter vault
export async function depositToVault(
  connectedAccount: any,
  vaultAddress: string,
  amount: string,
  isNative: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const toastId = toast.loading(`Depositing ${amount} ${isNative ? 'MAS' : 'WMAS'}...`);
  
  try {
    const splitterContract = new SmartContract(connectedAccount, vaultAddress);
    
    const args = new Args()
      .addU256(BigInt(parseMas(amount)))
      .addBool(isNative)
      .addU64(parseMas('1')) // coinsToUse
      .addU64(BigInt(Date.now() + 300000)) // deadline (5 minutes from now)
      .serialize();

    // Calculate total coins needed: deposit amount + gas fees
    const depositCoins = parseMas(amount);
    const gasCoins = parseMas('2'); // Extra for gas
    const totalCoins = isNative ? BigInt(depositCoins) + BigInt(gasCoins) : BigInt(gasCoins);

    console.log(`Depositing ${amount} MAS (isNative: ${isNative})`);
    console.log(`Total coins to send: ${totalCoins.toString()}`);

    toast.update(toastId, {
      render: 'Waiting for transaction confirmation...',
      isLoading: true
    });

    const operation = await splitterContract.call('deposit', args, {
      coins: totalCoins,
    });

    const status = await operation.waitSpeculativeExecution();

    if (status === OperationStatus.SpeculativeSuccess) {
      toast.update(toastId, {
        render: '💰 Deposit successful! Tokens are being split across your vault.',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: true };
    } else {
      const events = await operation.getSpeculativeEvents();
      console.log('Deposit failed, events:', events);
      
      toast.update(toastId, {
        render: 'Deposit transaction failed',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: false, error: 'Deposit transaction failed' };
    }
  } catch (error) {
    console.error('Error depositing to vault:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    toast.update(toastId, {
      render: `Deposit failed: ${errorMessage}`,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
    });
    
    return { success: false, error: errorMessage };
  }
}

// Approve WMAS spending for token deposits
export async function approveWMASSpending(
  connectedAccount: any,
  vaultAddress: string,
  amount: string
): Promise<{ success: boolean; error?: string }> {
  const toastId = toast.loading('Approving WMAS spending...');
  
  try {
    const WMAS_ADDRESS = 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU';
    const wmasContract = new SmartContract(connectedAccount, WMAS_ADDRESS);
    
    const args = new Args()
      .addString(vaultAddress) // spender
      .addU256(BigInt(parseMas(amount))) // amount
      .addU64(parseMas('1')) // coins for balance entry cost
      .serialize();

    console.log(`Approving vault ${vaultAddress} to spend ${amount} WMAS`);

    toast.update(toastId, {
      render: 'Waiting for approval confirmation...',
      isLoading: true
    });

    const operation = await wmasContract.call('increaseAllowance', args, {
      coins: parseMas('2'), // Gas for approval + balance entry cost
    });

    const status = await operation.waitSpeculativeExecution();

    if (status === OperationStatus.SpeculativeSuccess) {
      console.log('WMAS allowance increased successfully');
      
      toast.update(toastId, {
        render: '✅ WMAS spending approved successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });
      
      return { success: true };
    } else {
      const events = await operation.getSpeculativeEvents();
      console.log('Allowance increase failed, events:', events);
      
      toast.update(toastId, {
        render: 'Token approval failed',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: false, error: 'Token allowance increase failed' };
    }
  } catch (error) {
    console.error('Error increasing WMAS allowance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    toast.update(toastId, {
      render: `Approval failed: ${errorMessage}`,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
    });
    
    return { success: false, error: errorMessage };
  }
}

// Get token balances for a vault
export async function getVaultTokenBalances(
  connectedAccount: any,
  vaultAddress: string,
  tokenAddresses: string[]
): Promise<{ [tokenAddress: string]: string }> {
  const balances: { [tokenAddress: string]: string } = {};

  try {
    for (const tokenAddress of tokenAddresses) {
      try {
        console.log(`Getting balance for ${tokenAddress} in vault ${vaultAddress}`);
        
        // Create MRC20 contract instance exactly as you specified
        const tokenContract = new MRC20(connectedAccount, tokenAddress);
        
        // Get balance of the vault address using MRC20 balanceOf method
        const rawBalance = await tokenContract.balanceOf(vaultAddress);
        
        console.log(`Raw balance for ${tokenAddress}:`, rawBalance);
        console.log(`Raw balance type:`, typeof rawBalance);
        console.log(`Raw balance toString:`, rawBalance.toString());
        
        // Convert the balance to string first
        const balanceStr = rawBalance.toString();
        const balanceBigInt = BigInt(balanceStr);
        
        console.log(`Balance as BigInt:`, balanceBigInt);
        
        // Use correct decimal places for each token
        let decimals = 18; // Default to 18 decimals
        
        // Set specific decimals for each token
        if (tokenAddress === 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU') {
          decimals = 9; // WMAS uses 9 decimals
        } else if (tokenAddress === 'AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ') {
          decimals = 6; // USDC uses 6 decimals
        } else if (tokenAddress === 'AS12rcqHGQ3bPPhnjBZsYiANv9TZxYp96M7r49iTMUrX8XCJQ8Wrk') {
          decimals = 18; // WETH uses 18 decimals
        }
        
        console.log(`Using ${decimals} decimals for token ${tokenAddress}`);
        
        // Convert with proper decimal places
        const divisor = BigInt(10 ** decimals);
        const readableBalance = balanceBigInt > 0n ?
          (Number(balanceBigInt) / Number(divisor)).toFixed(6).replace(/\.?0+$/, '') : '0';
        
        balances[tokenAddress] = readableBalance;
        
        console.log(`Final readable balance for ${tokenAddress}: ${readableBalance}`);
        
      } catch (error) {
        console.error(`Error getting balance for ${tokenAddress}:`, error);
        balances[tokenAddress] = '0';
      }
    }
  } catch (error) {
    console.error('Error getting vault token balances:', error);
  }

  return balances;
}