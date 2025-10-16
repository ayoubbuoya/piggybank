import { Args, ArrayTypes } from '@massalabs/massa-web3';
import { DCAStatus, BASE_TOKEN_ADDRESS } from './types';
import { DUSA_DCA_CONTRACT_ADDRESS } from './dca';

/**
 * Get all active DCAs for a user that are sending to a specific vault
 * This queries the blockchain storage directly
 */
export async function getUserDCAsForVault(
    connectedAccount: any,
    userAddress: string,
    vaultAddress: string
): Promise<DCAStatus[]> {
    try {
        console.log(`Fetching DCAs for user ${userAddress} sending to vault ${vaultAddress}`);

        // Get all storage keys for this user's DCAs
        const storagePrefix = `D::${userAddress}:`;
        const keys = await connectedAccount.getStorageKeys(
            DUSA_DCA_CONTRACT_ADDRESS,
            storagePrefix,
            false
        );

        console.log(`Found ${keys.length} DCA storage keys for user`);

        const dcas: DCAStatus[] = [];
        const now = Math.floor(Date.now() / 1000);

        for (const key of keys) {
            try {
                // Deserialize the key to get DCA ID
                const keyStr = new TextDecoder().decode(key);
                console.log('Processing DCA key:', keyStr);

                // Key format is "D::userAddress:dcaId"
                // When split by ':', we get ['D', '', 'userAddress', 'dcaId']
                const parts = keyStr.split(':');
                if (parts.length < 4) {
                    console.warn(`Invalid key format: ${keyStr}, parts:`, parts);
                    continue;
                }

                // DCA ID is at the last position
                const dcaId = BigInt(parts[parts.length - 1]);

                // Read DCA data from storage
                console.log(`Reading storage for DCA ${dcaId}...`);
                const data = await connectedAccount.readStorage(
                    DUSA_DCA_CONTRACT_ADDRESS,
                    [keyStr],
                    false
                );

                console.log(`Storage data for DCA ${dcaId}:`, data);

                if (!data || !data[0] || data[0].length === 0) {
                    console.warn(`No data for DCA key: ${keyStr}`);
                    continue;
                }

                console.log(`Parsing DCA ${dcaId} data...`);
                const args = new Args(data[0]);

                const amountEachDCA = args.nextU256();
                const interval = Number(args.nextU64());
                const nbOfDCA = Number(args.nextU64());
                const tokenPath = args.nextArray(ArrayTypes.STRING);
                const threshold = Number(args.nextU32());
                const moreGas = args.nextBool();
                const startTimeMs = Number(args.nextU64()); // Dusa stores timestamps in milliseconds
                const executedCount = Number(args.nextU64());
                const deferredCallId = args.nextString();

                // Convert startTime from milliseconds to seconds for consistency
                const startTime = Math.floor(startTimeMs / 1000);

                console.log(`DCA ${dcaId} data:`, {
                    amountEachDCA: amountEachDCA.toString(),
                    interval,
                    nbOfDCA,
                    tokenPath,
                    threshold,
                    moreGas,
                    startTime,
                    executedCount,
                    deferredCallId,
                });

                // Check if this DCA is sending to our vault
                // For vault DCAs, tokenPath should be [USDC, USDC]
                const isUSDCDCA = tokenPath && tokenPath.length >= 1 && tokenPath[0] === BASE_TOKEN_ADDRESS;

                console.log(`DCA ${dcaId} tokenPath check:`, {
                    tokenPath,
                    firstToken: tokenPath?.[0],
                    BASE_TOKEN_ADDRESS,
                    isUSDCDCA,
                });

                if (!isUSDCDCA) {
                    console.log(`DCA ${dcaId} is not a USDC DCA, skipping`);
                    continue;
                }

                const endTime = startTime + (interval * nbOfDCA);

                console.log(`DCA ${dcaId} time check:`, {
                    startTime,
                    interval,
                    nbOfDCA,
                    endTime,
                    now,
                    isExpired: endTime <= now,
                    isCompleted: executedCount >= nbOfDCA,
                });

                // Filter out completed or expired DCAs
                if (endTime <= now || executedCount >= nbOfDCA) {
                    console.log(`DCA ${dcaId} is completed or expired, skipping (endTime: ${endTime}, now: ${now}, executedCount: ${executedCount}, nbOfDCA: ${nbOfDCA})`);
                    continue;
                }

                const dcaStatus: DCAStatus = {
                    id: Number(dcaId),
                    amountEachDCA,
                    interval,
                    nbOfDCA,
                    tokenPath: tokenPath as string[],
                    threshold,
                    moreGas,
                    startTime,
                    endTime,
                    executedCount,
                    deferredCallId,
                };

                dcas.push(dcaStatus);
                console.log(`Added DCA ${dcaId} to list`);
            } catch (error) {
                console.error('Error processing DCA:', error);
                continue;
            }
        }

        console.log(`Found ${dcas.length} active DCAs for vault ${vaultAddress}`);
        return dcas;
    } catch (error) {
        console.error('Error fetching user DCAs:', error);
        return [];
    }
}
