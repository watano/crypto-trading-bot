import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { Order } from '~/src/dict/order';
import { Position } from '~/src/dict/position';
import { Ticker } from '~/src/dict/ticker';
import { ExchangeOrderWatchdogListener } from '~/src/modules/listener/exchange_order_watchdog_listener';
import { StopLossCalculator } from '~/src/modules/order/stop_loss_calculator';
import { Tickers } from '~/src/storage/tickers';

// FIXME
describe.skip('#watchdogs are working', () => {
   const fakeLogger = { info: () => { }, error: () => { } };
   let calls: any[] = [];
   const fakeExchange = {
      getName: () => 'foobar',
      getOrdersForSymbol: async () => [],
      calculatePrice: (price: number) => price,
      order: async (order: Order) => calls.push(order),
      updateOrder: async (id: string, order: Order) => calls.push({ id: id, order: order }),
   };

   it('watchdog for stoploss is working (long)', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 99, 101) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { stop: 0.9 });
      assert.deepEqual(calls, ['foobar', 'FOOUSD', 'close']);
   });

   it('watchdog for stoploss is working (long) but valid', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 99, 101) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { stop: 1.9 });
      assert.deepEqual(calls, []);
   });

   it('watchdog for stoploss is working (long) profitable', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 100, 101) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { stop: 0.9 });
      assert.deepEqual(calls, []);
   });

   it('watchdog for stoploss is working (short)', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 99, 101) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'short', -1, undefined, undefined, 100), { stop: 0.9 });
      assert.deepEqual(calls, ['foobar', 'FOOUSD', 'close']);
   });

   it('watchdog for stoploss is working (short) but valid', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 99, 101) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'short', -1, undefined, undefined, 100), { stop: 1.1 });

      assert.deepEqual(calls, []);
   });

   it('watchdog for stoploss is working (short) profitable', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {},
         {},
         {},
         {},
         {},
         {
            update: async (exchange: any, symbol: string, state: string) => {
               calls.push(exchange, symbol, state);
            },
         },
         fakeLogger,
         { get: () => new Ticker('foobar', 'BTCUSD', 0, 98, 99) } as unknown as Tickers,
      );

      calls = [];
      await listener.stoplossWatch(fakeExchange, new Position('FOOUSD', 'short', -1, undefined, undefined, 100), { stop: 0.9 });

      assert.deepEqual(calls, []);
   });

   it('closed position should clear open orders', async () => {
      const symbols = [{ exchange: 'foobar', symbol: 'FOOUSD' }, { exchange: 'foobar', symbol: 'BTCUSD', watchdogs: [{ name: 'stoploss' }] }];
      const listener = new ExchangeOrderWatchdogListener(
         {},
         { symbols: symbols },
         {},
         {},
         {
            cancelAll: async (exchange: any, symbol: string) => {
               calls.push([exchange, symbol]);
            },
         },
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.onPositionChanged({ getExchange: () => 'foobar', getSymbol: () => 'BTCUSD', isClosed: () => true });

      assert.deepStrictEqual(calls[0], ['foobar', 'BTCUSD']);
   });

   it('closed position without watchdog should be ignored', async () => {
      const symbols = [{ exchange: 'foobar', symbol: 'BTCUSD' }];
      const listener = new ExchangeOrderWatchdogListener(
         {},
         { symbols: symbols },
         {},
         {},
         {
            cancelAll: async (exchange: any, symbol: string) => {
               calls.push([exchange, symbol]);
            },
         },
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.onPositionChanged({ getExchange: () => 'foobar', getSymbol: () => 'BTCUSD', isClosed: () => true });

      assert.deepStrictEqual(calls.length, 0);
   });

   it('watchdog for trailing stoploss is working (long)', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 105, 106) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.trailingStoplossWatch(fakeExchange, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });

      calls[0].id = undefined;
      assert.deepEqual(calls, [{ amount: 1, options: { close: true }, price: -1.05, side: 'short', symbol: 'FOOUSD', type: 'trailing_stop' }]);
   });

   it('watchdog for trailing stoploss is working (long) not activated', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 103, 104) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.trailingStoplossWatch(fakeExchange, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });
      assert.deepEqual(calls, []);
   });

   it('watchdog for trailing stoploss is working (short)', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 94, 94) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.trailingStoplossWatch(fakeExchange, new Position('FOOUSD', 'short', -1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });

      calls[0].id = undefined;
      assert.deepEqual(calls, [{ amount: 1, options: { close: true }, price: 0.95, side: 'long', symbol: 'FOOUSD', type: 'trailing_stop' }]);
   });

   it('watchdog for trailing stoploss is working (short) not activated', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 96, 96) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      await listener.trailingStoplossWatch(fakeExchange, new Position('FOOUSD', 'short', -1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });

      assert.deepEqual(calls, []);
   });

   it('watchdog for trailing stoploss with existing stop order, update needed', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 105, 106) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      const fakeExchange2 = Object.assign(fakeExchange, { getOrdersForSymbol: async () => [{ id: 123, amount: 0.5, type: ExchangeOrder.TYPE_TRAILING_STOP }] });
      await listener.trailingStoplossWatch(fakeExchange2, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });

      assert.deepEqual(calls, [{ id: 123, order: { id: 123, side: 'short', amount: -1, price: undefined, symbol: undefined, type: undefined, options: {} } }]);
   });

   it('watchdog for trailing stoploss with existing stop order, update not needed', async () => {
      const listener = new ExchangeOrderWatchdogListener(
         {}, //
         {},
         new StopLossCalculator({ get: () => new Ticker('foobar', 'BTCUSD', 0, 105, 106) } as unknown as Tickers, fakeLogger),
         {},
         {},
         {},
         fakeLogger,
         {} as unknown as Tickers,
      );

      calls = [];
      const fakeExchange2 = Object.assign(fakeExchange, { getOrdersForSymbol: async () => [{ id: 123, amount: 1, type: ExchangeOrder.TYPE_TRAILING_STOP }] });
      await listener.trailingStoplossWatch(fakeExchange2, new Position('FOOUSD', 'long', 1, undefined, undefined, 100), { target_percent: 5.0, stop_percent: 1.0 });

      assert.deepEqual(calls, []);
   });
});
