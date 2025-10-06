import { describe, expect, it } from 'bun:test';
import { ExchangeManager } from '~/src/modules/exchange/exchange_manager';
import { OrderCalculator } from '~/src/modules/order/order_calculator';
import { PairConfig } from '~/src/modules/pairs/pair_config';

describe('#order size calculation', () => {
   const testTickers: any = {
      get(exchangeName: string, symbol: string) {
         if (symbol === 'foo') {
            return { bid: 3000 };
         }

         if (symbol === 'foo2') {
            return { bid: 6000 };
         }

         return { bid: 8000 };
      },
   };

   const instances: any = {
      symbols: [
         { exchange: 'foobar', symbol: 'foo', trade: { currency_capital: 12 } },
         { exchange: 'foobar2', symbol: 'foo2' },
         { exchange: 'foobar', symbol: 'foo2', trade: { currency_capital: 1337 } },
         { exchange: 'foobar', symbol: 'foo_capital', trade: { capital: 0.0001 } },
         { exchange: 'foobar', symbol: 'foo_capital2', trade: { capital: 12 } },
         { exchange: 'foobar', symbol: 'foo_capital3', trade: { capital: 1337 } },
         { exchange: 'foobar', symbol: 'foo_balance', trade: { balance_percent: 50 } },
      ],
   };

   it('test instance order size for capital', async () => {
      const calculator = new OrderCalculator(testTickers, { error: () => { } }, {
         get: () => {
            return { calculateAmount: (n: number) => n, isInverseSymbol: () => false };
         },
      } as unknown as ExchangeManager, new PairConfig(instances));

      expect(await calculator.calculateOrderSize('foobar', 'foo_capital2')).toBe(12);
      expect(await calculator.calculateOrderSize('UNKNOWN', 'foo')).toBeUndefined();
      expect(await calculator.calculateOrderSize('foobar', 'foo_capital3')).toBe(1337);
   });

   it('test instance order size currency capital', async () => {
      const calculator = new OrderCalculator(testTickers, { error: () => { } }, {
         get: () => {
            return { calculateAmount: (n: number) => n, isInverseSymbol: () => false };
         },
      } as unknown as ExchangeManager, new PairConfig(instances));

      expect(await calculator.calculateOrderSize('foobar', 'foo')).toBe(0.004);
      expect(await calculator.calculateOrderSize('UNKNOWN', 'foo')).toBeUndefined();
      expect((await calculator.calculateOrderSize('foobar', 'foo2'))?.toFixed(2)).toBe('0.22');
   });

   it('test instance order size for inverse exchanges', async () => {
      const calculator = new OrderCalculator(testTickers, { error: () => { } }, {
         get: () => {
            return { getTradableBalance: () => 100, calculateAmount: (n: number) => n, isInverseSymbol: () => true };
         },
      } as unknown as ExchangeManager, new PairConfig(instances));

      expect(await calculator.calculateOrderSize('foobar', 'foo')).toBe(12);
      expect(await calculator.calculateOrderSize('UNKNOWN', 'foo')).toBeUndefined();
      expect(await calculator.calculateOrderSize('foobar', 'foo2')).toBe(1337.0);
      expect(await calculator.calculateOrderSize('foobar', 'foo_capital')).toBe(0.8);
      expect(await calculator.calculateOrderSize('foobar', 'foo_balance')).toBe(50);
   });
});
