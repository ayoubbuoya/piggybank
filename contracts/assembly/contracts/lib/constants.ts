import { u256 } from "as-bignum/assembly";

export const SCALE_OFFSET = 128;
export const PRECISION: u256 = u256.fromU64(1 * 10 ** 18); // 1e18
