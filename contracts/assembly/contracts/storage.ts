import { PersistentMap } from '@massalabs/massa-as-sdk/assembly/collections';

// Persistent Map to store each token pool adddress
export const tokenPool = new PersistentMap<String, String>('tokenPool');

export const WMAS_TOKEN_ADDRESS =
  'AS12FW5Rs5YN2zdpEnqwj4iHUUPt9R4Eqjq2qtpJFNKW3mn33RuLU';
