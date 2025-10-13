import { GasManager } from '../contracts/lib/automation/GasManager';
import { setDeployContext, resetStorage } from '@massalabs/massa-as-sdk';

describe('GasManager unit tests', () => {
    beforeEach(() => {
        // Reset storage before each test
        resetStorage();
        setDeployContext();
    });

    test('initial gas reserve should be zero', () => {
        const reserve = GasManager.getGasReserve();
        expect(reserve).toBe(0);
    });

    test('depositGas should increase gas reserve', () => {
        const depositAmount: u64 = 1000000;
        GasManager.depositGas(depositAmount);

        const reserve = GasManager.getGasReserve();
        expect(reserve).toBe(depositAmount);
    });

    test('multiple deposits should accumulate', () => {
        GasManager.depositGas(500000);
        GasManager.depositGas(300000);

        const reserve = GasManager.getGasReserve();
        expect(reserve).toBe(800000);
    });

    test('consumeGas should decrease gas reserve', () => {
        GasManager.depositGas(1000000);
        const consumed = GasManager.consumeGas(400000);

        expect(consumed).toBe(true);
        expect(GasManager.getGasReserve()).toBe(600000);
    });

    test('consumeGas should fail with insufficient gas', () => {
        GasManager.depositGas(100000);
        const consumed = GasManager.consumeGas(200000);

        expect(consumed).toBe(false);
        expect(GasManager.getGasReserve()).toBe(100000);
    });

    test('estimateGasForOperation should return correct estimates', () => {
        const dcaGas = GasManager.estimateGasForOperation('DCA');
        const depositGas = GasManager.estimateGasForOperation('DEPOSIT');
        const strategyGas = GasManager.estimateGasForOperation('STRATEGY');
        const unknownGas = GasManager.estimateGasForOperation('UNKNOWN');

        expect(dcaGas).toBe(500000000000);
        expect(depositGas).toBe(200000000000);
        expect(strategyGas).toBe(300000000000);
        expect(unknownGas).toBe(100000000000);
    });

    test('hasSufficientGas should validate correctly', () => {
        GasManager.depositGas(1000000);

        expect(GasManager.hasSufficientGas(500000)).toBe(true);
        expect(GasManager.hasSufficientGas(1000000)).toBe(true);
        expect(GasManager.hasSufficientGas(1500000)).toBe(false);
    });

    test('reserveGasForOperation should consume gas for valid operations', () => {
        const dcaGasEstimate = GasManager.estimateGasForOperation('DCA');
        GasManager.depositGas(dcaGasEstimate + 100000);

        const reserved = GasManager.reserveGasForOperation('DCA');
        expect(reserved).toBe(true);
        expect(GasManager.getGasReserve()).toBe(100000);
    });

    test('reserveGasForOperation should fail with insufficient gas', () => {
        GasManager.depositGas(100000);

        const reserved = GasManager.reserveGasForOperation('DCA');
        expect(reserved).toBe(false);
        expect(GasManager.getGasReserve()).toBe(100000);
    });

    test('getMinimumReserve should calculate correctly', () => {
        const minReserve = GasManager.getMinimumReserve('DCA', 5);
        const expectedReserve = GasManager.estimateGasForOperation('DCA') * 5;

        expect(minReserve).toBe(expectedReserve);
    });

    test('gas operations should handle edge cases', () => {
        // Test with zero deposit
        GasManager.depositGas(0);
        expect(GasManager.getGasReserve()).toBe(0);

        // Test consuming zero gas
        GasManager.depositGas(1000);
        const consumed = GasManager.consumeGas(0);
        expect(consumed).toBe(true);
        expect(GasManager.getGasReserve()).toBe(1000);
    });
});
