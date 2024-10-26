import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { OrderCapital } from '~/src/dict/order_capital';
import { PairState } from '~/src/dict/pair_state';
import { Position } from '~/src/dict/position';
import { PairStateExecution } from '~/src/modules/pairs/pair_state_execution';

describe('#pair state execution', () => {
   it('test limit open order trigger for long', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         undefined,
         {
            calculateOrderSizeCapital: () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.pairStateExecuteOrder(PairState.createLong('exchange', 'BTCUSD', OrderCapital.createAsset(1337), {}, true, () => {}));

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'long');
      assert.equal(myOrder.price, 0);
      assert.equal(myOrder.amount, 1337);
      assert.equal(myOrder.type, 'limit');
      assert.equal(myOrder.options.post_only, true);
      assert.equal(myOrder.hasAdjustedPrice(), true);
   });

   it('test limit open order trigger for long (market)', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         undefined,
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.pairStateExecuteOrder(
         PairState.createLong(
            'exchange', //
            'BTCUSD',
            OrderCapital.createAsset(1337),
            { market: true },
            true,
            () => {},
         ),
      );

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'long');
      assert.equal(myOrder.price > 0, true);
      assert.equal(myOrder.amount, 1337);
      assert.equal(myOrder.type, 'market');
      assert.equal(myOrder.hasAdjustedPrice(), false);
   });

   it('test limit open order trigger for short', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         undefined,
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.pairStateExecuteOrder(PairState.createShort('exchange', 'BTCUSD', OrderCapital.createAsset(1337), {}, true, () => {}));

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'short');
      assert.equal(myOrder.price, 0);
      assert.equal(myOrder.amount, -1337);
      assert.equal(myOrder.type, 'limit');
      assert.equal(myOrder.options.post_only, true);
      assert.equal(myOrder.hasAdjustedPrice(), true);
   });

   it('test limit open order trigger for long (short)', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         undefined,
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.pairStateExecuteOrder(PairState.createShort('exchange', 'BTCUSD', OrderCapital.createAsset(1337), { market: true }, true, () => {}));

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'short');
      assert.equal(myOrder.price < 0, true);
      assert.equal(myOrder.amount, -1337);
      assert.equal(myOrder.type, 'market');
      assert.equal(myOrder.hasAdjustedPrice(), false);
   });

   it('test limit close order trigger for long', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         {
            get: () => {
               return { calculateAmount: (v: any) => v };
            },
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: async (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.executeCloseOrder('exchange', 'BTCUSD', 1337, {});

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'long');
      assert.equal(myOrder.price, 0);
      assert.equal(myOrder.amount, 1337);
      assert.equal(myOrder.type, 'limit');
      assert.equal(myOrder.options.post_only, true);
      assert.equal(myOrder.hasAdjustedPrice(), true);
   });

   it('test market close order trigger for long', async () => {
      let myOrder: any;

      const executor = new PairStateExecution(
         {
            get: () => {
               return { calculateAmount: (v: any) => v };
            },
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.executeCloseOrder('exchange', 'BTCUSD', 1337, { market: true });

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'long');
      assert.equal(myOrder.price > 0, true);
      assert.equal(myOrder.amount, 1337);
      assert.equal(myOrder.type, 'market');
      assert.deepEqual(myOrder.options, {});
   });

   it('test market close order trigger for short', async () => {
      let myOrder: any;

      const logMessages = {
         info: [],
         error: [],
      };

      const executor = new PairStateExecution(
         {
            get: () => {
               return { calculateAmount: (v: any) => v };
            },
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: (exchange: any, order: any) => {
               myOrder = order;
               return undefined;
            },
         },
         undefined,
      );

      await executor.executeCloseOrder('exchange', 'BTCUSD', -1337, { market: true });

      assert.equal(myOrder.symbol, 'BTCUSD');
      assert.equal(myOrder.side, 'short');
      assert.equal(myOrder.price < 0, true);
      assert.equal(myOrder.amount, -1337);
      assert.equal(myOrder.type, 'market');
      assert.deepEqual(myOrder.options, {});
   });

   it('test buy/sell directly filled', async () => {
      const logMessages: any = {
         info: [],
      };

      const executor = new PairStateExecution(
         {
            getPosition: async () => undefined,
            getOrders: async () => [],
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: async () =>
               new ExchangeOrder(
                  'foobar', //
                  'ADAUSDT',
                  'done',
                  0,
                  0,
                  true,
                  undefined,
                  'buy',
                  ExchangeOrder.TYPE_LIMIT,
               ),
         },
         {
            info: (message: string) => {
               logMessages.info.push(message);
            },
         },
      );

      const clearCalls: any[] = [];
      await executor.onSellBuyPair(
         PairState.createLong('foobar', 'ADAUSDT', OrderCapital.createAsset(1337), {}, true, () => {
            clearCalls.push([]);
         }),
      );

      assert.strictEqual(clearCalls.length, 1);

      assert.strictEqual(logMessages.info.filter((msg: any) => msg.includes('position open order')).length, 1);
      assert.strictEqual(logMessages.info.filter((msg: any) => msg.includes('directly filled clearing state')).length, 1);
   });

   it('test buy/sell rejected and state is cleared', async () => {
      const logMessages: any = {
         info: [],
         error: [],
      };

      const executor = new PairStateExecution(
         {
            getPosition: async () => undefined,
            getOrders: async () => [],
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: async () =>
               new ExchangeOrder(
                  'foobar', //
                  'ADAUSDT',
                  ExchangeOrder.STATUS_REJECTED,
                  0,
                  0,
                  false,
                  undefined,
                  'buy',
                  ExchangeOrder.TYPE_LIMIT,
               ),
         },
         {
            info: (message: any) => {
               logMessages.info.push(message);
            },
            error: (message: any) => {
               logMessages.error.push(message);
            },
         },
      );

      const clearCalls: any[] = [];
      await executor.onSellBuyPair(
         PairState.createLong(
            'foobar',
            'ADAUSDT',
            OrderCapital.createAsset(1337),
            () => {},
            true,
            () => {
               clearCalls.push([]);
            },
         ),
      );

      assert.strictEqual(clearCalls.length, 1);

      assert.strictEqual(logMessages.info.filter((msg: any) => msg.includes('position open order')).length, 1);
      assert.strictEqual(logMessages.error.filter((msg: any) => msg.includes('order rejected clearing pair state')).length, 1);
   });

   it('test buy/sell directly filled for closing an order', async () => {
      const logMessages: any = {
         info: [],
      };

      const executor = new PairStateExecution(
         {
            getPosition: async () => new Position('ADAUSDT', 'long', 1337, 0),
            getOrders: async () => [],
            get: () => {
               return { calculateAmount: (v: any) => v };
            },
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: async () =>
               new ExchangeOrder(
                  'foobar', //
                  'ADAUSDT',
                  'done',
                  0,
                  0,
                  false,
                  undefined,
                  'buy',
                  ExchangeOrder.TYPE_LIMIT,
               ),
         },
         {
            info: (message: any) => {
               logMessages.info.push(message);
            },
         },
      );

      const clearCalls: any = [];
      const pairState = new PairState('foobar', 'ADAUSDT', 'long', {}, true, () => {
         clearCalls.push([]);
      });

      await executor.onClosePair(pairState);

      assert.strictEqual(clearCalls.length, 1);

      assert.strictEqual(logMessages.info.filter((msg: any) => msg.includes('position close order')).length, 1);
      assert.strictEqual(logMessages.info.filter((msg: any) => msg.includes('directly filled clearing state')).length, 1);
   });

   it.skip('test onPairStateExecutionTick calling', async () => {
      const logMessages: any = {
         error: [],
      };

      const clearCalls: any[] = [];
      const pairState = new PairState('foobar', 'ADAUSDT', 'long', {}, true, () => {
         clearCalls.push([]);
      });

      for (let i = 0; i < 20; i++) {
         pairState.triggerRetry();
      }

      const executor = new PairStateExecution(
         {
            getPosition: async () => new Position('ADAUSDT', 'long', 1337, 0),
            getOrders: async () => [],
            get: () => {
               return { calculateAmount: (v: any) => v };
            },
         },
         {
            calculateOrderSizeCapital: async () => {
               return 1337;
            },
         },
         {
            executeOrder: async () =>
               new ExchangeOrder(
                  'foobar', //
                  'ADAUSDT',
                  'done',
                  0,
                  0,
                  false,
                  undefined,
                  'buy',
                  ExchangeOrder.TYPE_LIMIT,
               ),
            cancelAll: async () => {},
         },
         {
            error: (message: any) => {
               logMessages.error.push(message);
            },
         },
      );

      await executor.onPairStateExecutionTick(pairState);

      assert.strictEqual(clearCalls.length, 1);
      assert.strictEqual(logMessages.error.filter((msg: any) => msg.includes('max retries')).length, 1);
   });
});
