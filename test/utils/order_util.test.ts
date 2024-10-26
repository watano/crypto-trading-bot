import { describe, it } from 'bun:test';
import assert from 'node:assert';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { Position } from '~/src/dict/position';
import * as orderUtil from '~/src/utils/order_util';

describe('#order util', () => {
   it('calculate order amount', () => {
      assert.strictEqual(0.0154012, Number.parseFloat(orderUtil.calculateOrderAmount(6493, 100).toFixed(8)));
   });

   it('sync stoploss exchange order (long)', () => {
      const position = new Position('LTCUSD', 'long', 4, 0, new Date());

      // stop loss create
      assert.deepStrictEqual([{ amount: 4 }], orderUtil.syncStopLossOrder(position, []));

      // stop loss update
      assert.deepStrictEqual(
         [{ id: 'foobar', amount: 4 }],
         orderUtil.syncStopLossOrder(position, [
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, 3, false, 'our_id', 'long', 'stop'), //
         ]),
      );

      // stop loss: missing value
      assert.deepStrictEqual(
         [{ id: 'foobar', amount: 4 }],
         orderUtil.syncStopLossOrder(position, [
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, 3, false, 'our_id', 'long', 'limit'), //
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, -2, false, 'our_id', 'long', 'stop'),
         ]),
      );

      assert.deepStrictEqual(
         [{ id: 'foobar', amount: 4 }],
         orderUtil.syncStopLossOrder(position, [
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, 3, false, 'our_id', 'long', 'limit'), //
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, -5, false, 'our_id', 'long', 'stop'),
         ]),
      );

      // stop loss correct
      assert.deepStrictEqual(
         [],
         orderUtil.syncStopLossOrder(position, [
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, 3, false, 'our_id', 'long', 'limit'), //
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, -4, false, 'our_id', 'long', 'stop'),
         ]),
      );
   });

   it('sync stoploss exchange order (short)', () => {
      const position = new Position('LTCUSD', 'short', -4, 0, new Date());

      // stop loss update
      assert.deepStrictEqual(
         [],
         orderUtil.syncStopLossOrder(position, [
            new ExchangeOrder('foobar', 'BTUSD', 'open', 1337, 4, false, 'our_id', 'long', 'stop'), //
         ]),
      );

      // stop loss create
      assert.deepStrictEqual([{ amount: 4 }], orderUtil.syncStopLossOrder(position, []));
   });

   it('calculate increment size', () => {
      assert.strictEqual(orderUtil.calculateNearestSize(0.0085696, 0.00001), '0.00856');
      assert.strictEqual(orderUtil.calculateNearestSize(50.55, 2.5), '50.0');

      assert.strictEqual(orderUtil.calculateNearestSize(50.22, 1), '50');
      assert.strictEqual(orderUtil.calculateNearestSize(50.88, 1), '50');

      assert.strictEqual(orderUtil.calculateNearestSize(-149.87974, 0.01), '-149.87');
   });

   it('calculate percent change', () => {
      assert.strictEqual(50, orderUtil.getPercentDifferent(0.5, 1));
      assert.strictEqual(50, orderUtil.getPercentDifferent(1, 0.5));

      assert.strictEqual('1.20', orderUtil.getPercentDifferent(0.004036, 0.004085).toFixed(2));
      assert.strictEqual('1.20', orderUtil.getPercentDifferent(0.004085, 0.004036).toFixed(2));
   });
});
