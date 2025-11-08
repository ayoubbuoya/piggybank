import { Args, Mas, SmartContract, Web3Provider } from '@massalabs/massa-web3';
import { getScByteCode } from '../utils';

export async function deployLiqManager(
  provider: Web3Provider,
  poolAddress: string = 'AS1p6ULD2dWxJ7G1U3D3dX95jHwgfXieRnLFRNRr4Hfq7XvA1qZf',
  intervalsMs: number = 60000,
): Promise<SmartContract> {
  console.log('Deploying liq manager contract...');

  const byteCode = getScByteCode('build', 'liqManager.wasm');

  const constructorArgs = new Args()
    .addString(poolAddress)
    .addU64(BigInt(intervalsMs));

  const contract = await SmartContract.deploy(
    provider,
    byteCode,
    constructorArgs,
    {
      coins: Mas.fromString('0.1'),
    },
  );

  console.log('Liq Manager Contract deployed at:', contract.address);

  return contract;
}
