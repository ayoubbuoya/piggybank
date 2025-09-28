import { SmartContract, Args, parseMas, OperationStatus, bytesToStr, MRC20, Web3Provider } from '@massalabs/massa-web3';
import { toast } from 'react-toastify';
import { TokenWithPercentage, TokenSelection, AVAILABLE_TOKENS } from './types';

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
        const finalStatus = await operation.waitSpeculativeExecution();
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
          decimals = 18; // WMAS uses 18 decimals
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

// Withdraw tokens from a vault (only owner can withdraw)
export async function withdrawFromVault(
  connectedAccount: any,
  vaultAddress: string,
  tokenAddress: string,
  amount: string,
  toAddress: string
): Promise<{ success: boolean; error?: string }> {
  const toastId = toast.loading('Withdrawing tokens...');
  
  try {
    const vaultContract = new SmartContract(connectedAccount, vaultAddress);
    
    // Use correct decimal places for each token (same as balance reading)
    let decimals = 18; // Default to 18 decimals
    
    // Set specific decimals for each token
    if (tokenAddress === 'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU') {
      decimals = 18; // WMAS uses 18 decimals
    } else if (tokenAddress === 'AS12N76WPYB3QNYKGhV2jZuQs1djdhNJLQgnm7m52pHWecvvj1fCQ') {
      decimals = 6; // USDC uses 6 decimals
    } else if (tokenAddress === 'AS12rcqHGQ3bPPhnjBZsYiANv9TZxYp96M7r49iTMUrX8XCJQ8Wrk') {
      decimals = 18; // WETH uses 18 decimals
    }

    // Convert amount to token's smallest unit using correct decimals
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * (10 ** decimals)));
    
    console.log(`Converting ${amount} with ${decimals} decimals = ${amountInSmallestUnit.toString()}`);

    const args = new Args()
      .addString(tokenAddress) // token address
      .addU256(amountInSmallestUnit) // amount in token's smallest unit
      .addString(toAddress) // to address
      .serialize();

    console.log(`Withdrawing ${amount} tokens from vault ${vaultAddress}`);
    console.log(`Token: ${tokenAddress}, To: ${toAddress}`);

    toast.update(toastId, {
      render: 'Waiting for withdrawal confirmation...',
      isLoading: true
    });

    const operation = await vaultContract.call('withdraw', args, {
      coins: parseMas('2'), // Gas for withdrawal
    });

    const status = await operation.waitSpeculativeExecution();

    if (status === OperationStatus.SpeculativeSuccess) {
      toast.update(toastId, {
        render: '💸 Withdrawal successful! Tokens transferred to your address.',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: true };
    } else {
      const events = await operation.getSpeculativeEvents();
      console.log('Withdrawal failed, events:', events);
      
      toast.update(toastId, {
        render: 'Withdrawal transaction failed',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
      
      return { success: false, error: 'Withdrawal transaction failed' };
    }
  } catch (error) {
    console.error('Error withdrawing from vault:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    toast.update(toastId, {
      render: `Withdrawal failed: ${errorMessage}`,
      type: 'error',
      isLoading: false,
      autoClose: 5000,
    });
    
    return { success: false, error: errorMessage };
  }
}

// Get splitter vault creation timestamp - Using your exact working code pattern
export async function getSplitterCreationTimestamp(
  provider: Web3Provider,
  splitterVaultContract: SmartContract,
): Promise<number> {
  console.log('Fetching splitter vault creation timestamp...');

  const value = await provider.readStorage(
    splitterVaultContract.address,
    ['createdAt'],
    false,
  );

  if (!value || value.length === 0) {
    throw new Error('No value found for key: createdAt');
  }

  const creationTimestamp = new Args(value[0]!).nextU64();

  if (!creationTimestamp) {
    throw new Error('Failed to parse creation timestamp');
  }

  return Number(creationTimestamp);
}

// Get splitter vault tokens and percentages - Using your exact working code pattern
export async function getSplitterTokensPercentages(
  provider: Web3Provider,
  splitterVaultContract: SmartContract,
): Promise<TokenWithPercentage[]> {
  console.log('Fetching splitter vault tokens and percentages...');

  const keys = await provider.getStorageKeys(
    splitterVaultContract.address,
    'tpm::',
    false,
  );

  const tokensWithPercentage: TokenWithPercentage[] = [];

  for (const key of keys) {
    const deserializedKey = bytesToStr(key);
    console.log('Deserialized key:', deserializedKey);
    const tokenAddress = deserializedKey.split('::')[1];
    // Fetch Key Value from storage
    const value = await provider.readStorage(
      splitterVaultContract.address,
      [deserializedKey],
      false,
    );

    console.log(`Value for key ${deserializedKey}:`, value);

    if (!value || value.length === 0) {
      console.warn(`No value found for key: ${deserializedKey}`);
      continue;
    }

    const tokenPercentage = new Args(value[0]!).nextU64();

    console.log(`Token: ${tokenAddress}, Percentage: ${tokenPercentage}`);

    tokensWithPercentage.push(
      new TokenWithPercentage(tokenAddress, tokenPercentage!),
    );
  }

  return tokensWithPercentage;
}

// Convert TokenWithPercentage to TokenSelection for UI
export async function getVaultTokenSelections(
  connectedAccount: any,
  vaultAddress: string
): Promise<TokenSelection[]> {
  try {
    
    const splitterVaultContract = new SmartContract(connectedAccount, vaultAddress);
    
    const tokensWithPercentage = await getSplitterTokensPercentages(connectedAccount, splitterVaultContract);
    
    const tokenSelections: TokenSelection[] = tokensWithPercentage.map(tokenWithPerc => {
      // Find the token info from AVAILABLE_TOKENS
      const tokenInfo = AVAILABLE_TOKENS.find(token => token.address === tokenWithPerc.address);
      
      if (tokenInfo) {
        return {
          ...tokenInfo,
          percentage: Number(tokenWithPerc.percentage),
          isSelected: true
        };
      } else {
        // If token not in our predefined list, create basic info
        return {
          address: tokenWithPerc.address,
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          logo: '',
          percentage: Number(tokenWithPerc.percentage),
          isSelected: true
        };
      }
    });

    console.log('Converted to token selections:', tokenSelections);
    return tokenSelections;
  } catch (error) {
    console.error('Error getting vault token selections:', error);
    return [];
  }
}
