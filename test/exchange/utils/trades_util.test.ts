import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import moment from 'moment';
import * as TradesUtil from '~/src/exchange/utils/trades_util';

describe('#trades utils', () => {
   it('position entry is extracted for short position', async () => {
      const trades = [
         {
            side: 'sell',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 2027.2,
         },
         {
            side: 'sell',
            price: 0.16234,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1851.7,
         },
         {
            side: 'sell',
            price: 0.01,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1100006.5,
         },
      ];

      const position = TradesUtil.findPositionEntryFromTrades(trades, 2027.2 + 1851.7, 'short');

      assert.strictEqual(Number.parseFloat(position?.average_price.toFixed(5)), 0.16773);
      assert.notStrictEqual(position?.time, undefined);
   });

   it('position entry is extracted for short position with target hit', async () => {
      const trades = [
         {
            side: 'buy',
            price: 0.17065,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 800,
         },
         {
            side: 'sell',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 2027.2,
         },
         {
            side: 'sell',
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1851.7,
         },
         {
            side: 'sell',
            price: 0.01,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 100106.5,
         },
      ];

      const position = TradesUtil.findPositionEntryFromTrades(trades, 2027.2 + 1851.7 - 800, 'short');

      assert.strictEqual(Number.parseFloat(position?.average_price.toFixed(5)), 0.17265);
      assert.notStrictEqual(position?.time, undefined);
   });

   it('position entry is extracted for long position', async () => {
      const trades = [
         {
            side: 'buy',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 2027.2,
         },
         {
            side: 'buy',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1851.7,
         },
         {
            side: 'sell',
            price: 0.01,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 100106.5,
         },
      ];

      const position = TradesUtil.findPositionEntryFromTrades(trades, 2027.2 + 1851.7, 'long');

      assert.strictEqual(Number.parseFloat(position?.average_price.toFixed(5)), 0.17265);
      assert.notStrictEqual(position?.time, undefined);
   });

   it('position entry is extracted for long position with target it', async () => {
      const trades = [
         {
            side: 'sell',
            price: 0.18065,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 800,
         },
         {
            side: 'buy',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 2027.2,
         },
         {
            side: 'buy',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1851.7,
         },
         {
            side: 'sell',
            price: 0.01,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 100106.5,
         },
      ];

      const position = TradesUtil.findPositionEntryFromTrades(trades, 2027.2 + 1851.7 - 800, 'long');

      assert.strictEqual(Number.parseFloat(position?.average_price.toFixed(5)), 0.17265);
      assert.notStrictEqual(position?.time, undefined);
   });

   it('test outdated trade is possible a closed trade and should not provide a position entry', async () => {
      const trades = [
         {
            side: 'buy',
            price: 0.17265,
            symbol: 'XRPBUSD',
            time: moment().subtract(5, 'days'),
            size: 2027.2,
         },
         {
            side: 'sell',
            price: 0.16234,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1851.7,
         },
         {
            side: 'sell',
            price: 0.01,
            symbol: 'XRPBUSD',
            time: new Date(),
            size: 1100006.5,
         },
      ];

      const position = TradesUtil.findPositionEntryFromTrades(trades, 2027.2 + 1851.7, 'short');
      assert.strictEqual(position, undefined);
   });
});
