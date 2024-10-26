import { describe, expect, it } from 'bun:test';
import { Ticker } from '~/src/dict/ticker';
import { TickListener } from '~/src/modules/listener/tick_listener';
import { SignalResult } from '~/src/modules/strategy/dict/signal_result';
import { Tickers } from '~/src/storage/tickers';

describe('#tick listener for order', () => {
   it('test tick listener for live order', async () => {
      let updates: any[] = [];

      const listener = new TickListener(
         { get: () => new Ticker('unknown', 'BTC', 123456, 12, 12) } as unknown as Tickers,
         {},
         { send: () => {} },
         { signal: () => {} },
         {
            executeStrategy: async () => {
               return SignalResult.createSignal('short', {});
            },
         },
         {
            getPosition: async () => {
               return undefined;
            },
         },
         {
            update: async (exchange: string, symbol: string, signal: string) => {
               updates.push(exchange, symbol, signal);
               return [];
            },
         },
         { info: () => {} },
         {},
         {},
         {},
      );

      await listener.visitTradeStrategy('foobar', {
         symbol: 'FOOUSD',
         exchange: 'FOOBAR',
      });

      expect(updates).toEqual(['FOOBAR', 'FOOUSD', 'short']);

      // reset; block for time window
      updates = [];
      await listener.visitTradeStrategy('foobar', {
         symbol: 'FOOUSD',
         exchange: 'FOOBAR',
      });

      expect(updates).toEqual([]);
   });

   it('test tick listener for notifier order', async () => {
      const calls: any[] = [];

      const listener = new TickListener(
         { get: () => new Ticker('unknown', 'BTC', 123456, 12, 12) } as unknown as Tickers,
         {},
         { send: () => {} },
         {
            signal: (exchange: string, symbol: string, opts: any, signal: string, strategyKey: string) => {
               calls.push(exchange, symbol, opts, signal, strategyKey);
               return [];
            },
         },
         {
            executeStrategy: async () => {
               return SignalResult.createSignal('short', {});
            },
         },
         {
            getPosition: async () => {
               return undefined;
            },
         },
         {},
         { info: () => {} },
         {},
         {},
         {},
      );

      await listener.visitStrategy(
         { strategy: 'foobar' },
         {
            symbol: 'FOOUSD',
            exchange: 'FOOBAR',
         },
      );

      expect(calls).toEqual(['FOOBAR', 'FOOUSD', { price: 12, strategy: 'foobar', raw: '{"_debug":{},"_signal":"short","placeOrders":[]}' }, 'short', 'foobar']);
   });
});
