import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import moment from 'moment';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { Order } from '~/src/dict/order';
import { PairState } from '~/src/dict/pair_state';
import { Ticker } from '~/src/dict/ticker';
import { ExchangeManager } from '~/src/modules/exchange/exchange_manager';
import { OrderExecutor } from '~/src/modules/order/order_executor';
import { SystemUtil } from '~/src/modules/system/system_util';
import { Tickers } from '~/src/storage/tickers';

describe('#order executor', () => {
   it('test order create execution', async () => {
      const exchangeOrders: ExchangeOrder[] = [
         new ExchangeOrder(
            '1815-1337-1', //
            '',
            '',
            0,
            0,
            false,
            undefined,
            'buy',
            ExchangeOrder.TYPE_LIMIT,
         ),
      ];

      const configs: any = {
         'order.retry': 3,
         'order.retry_ms': 8,
      };

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});

      let i = 0;
      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  order: () => {
                     return exchangeOrders[i++];
                  },
               };
            },
         } as unknown as ExchangeManager,
         {} as unknown as Tickers,
         {
            getConfig: (key: string) => {
               return configs[key];
            },
         } as unknown as SystemUtil,
         { info: () => {}, error: () => {} },
         { all: () => [pairState] },
      );

      const result = await executor.executeOrder('foobar', Order.createLimitPostOnlyOrderAutoSide('BTCUSD', 1337, -10));

      assert.equal(i, 1);
      //FIXME
      //assert.equal(result?.id, '1815-1337-1');
   });

   it('test order create execution with retry', async () => {
      const exchangeOrders: ExchangeOrder[] = [
         new ExchangeOrder('1815-1337-1', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-2', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-3', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-4', '', '', 0, 0, false, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
      ];

      const configs: any = {
         'order.retry': 3,
         'order.retry_ms': 8,
      };

      let i = 0;
      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  order: () => {
                     return exchangeOrders[i++];
                  },
               };
            },
         } as unknown as ExchangeManager,
         {} as unknown as Tickers,
         {
            getConfig: (key: string) => {
               return configs[key];
            },
         } as unknown as SystemUtil,
         { info: () => {}, error: () => {} },
      );

      const result = await executor.executeOrder('foobar', Order.createLimitPostOnlyOrderAutoSide('BTCUSD', 1337, -10, {}));

      //FIXME
      //assert.equal(i, 4);
      //assert.equal(result?.id, '1815-1337-4');
   });

   it('test order create execution with out of retry limit', async () => {
      const exchangeOrders: ExchangeOrder[] = [
         new ExchangeOrder('1815-1337-1', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-2', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-3', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-4', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
         new ExchangeOrder('1815-1337-4', '', '', 0, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
      ];

      const configs: any = {
         'order.retry': 3,
         'order.retry_ms': 8,
      };

      let i = 0;
      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  order: () => {
                     return exchangeOrders[i++];
                  },
               };
            },
         } as unknown as ExchangeManager,
         {} as unknown as Tickers,
         {
            getConfig: (key: string) => {
               return configs[key];
            },
         } as unknown as SystemUtil,
         { info: () => {}, error: () => {} },
      );

      const result = await executor.executeOrder('foobar', Order.createLimitPostOnlyOrderAutoSide('BTCUSD', 1337, -10));

      //FIXME
      //assert.equal(i, 4);
      //assert.equal(result, undefined);
   });

   it('test that adjust price handler must clean up unknown orders', async () => {
      const exchangeOrder = new ExchangeOrder('1815-1337', '', '', 0, 0, false, undefined, 'buy', ExchangeOrder.TYPE_LIMIT);

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});
      pairState.setExchangeOrder(exchangeOrder);

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  findOrderById: () => {
                     return exchangeOrder;
                  },
               };
            },
         } as unknown as ExchangeManager,
         {} as unknown as Tickers,
         undefined,
         { debug: () => {} },
         { all: () => [pairState] },
      );

      await executor.adjustOpenOrdersPrice();
      assert.equal('1815-1337' in executor.runningOrders, false);
   });

   it('test that adjust price handler must clean up outdated managed orders', async () => {
      const executor = new OrderExecutor(
         {} as unknown as ExchangeManager, //
         {} as unknown as Tickers,
         undefined,
         { debug: () => {} },
         { all: () => [] },
      );

      // current
      executor.runningOrders['1815-1337'] = new Date();
      await executor.adjustOpenOrdersPrice();
      assert.equal('1815-1337' in executor.runningOrders, true);

      // outdated
      executor.runningOrders['1815-1337'] = moment().subtract(180, 'minutes');
      await executor.adjustOpenOrdersPrice();
      assert.equal('1815-1337' in executor.runningOrders, false);
   });

   it('test that price adjust order is created for long', async () => {
      const exchangeOrder = new ExchangeOrder('1815-1337', '', 'open', 0, 0, false, undefined, 'buy', ExchangeOrder.TYPE_LIMIT);

      let exchangeName: string | undefined;
      let orderUpdate: any;

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});
      pairState.setExchangeOrder(exchangeOrder);

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  findOrderById: () => {
                     return new Promise((resolve) => {
                        resolve(exchangeOrder);
                     });
                  },
                  updateOrder: (myExchangeName: string, myOrderUpdate: any) => {
                     return new Promise((resolve) => {
                        exchangeName = myExchangeName;
                        orderUpdate = myOrderUpdate;

                        resolve(exchangeOrder);
                     });
                  },
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => {
               return new Ticker('exchange', 'FOOUSD', 0, 1337, 1338);
            },
         } as unknown as Tickers,
         undefined,
         { info: () => {}, error: () => {} },
      );

      await executor.adjustOpenOrdersPrice(pairState);

      assert.equal(orderUpdate?.price, 1337);
      assert.equal(Object.keys(executor.runningOrders).length, 0);
   });

   //FIXME
   it.skip('test that price adjust order is recreated on placing error [long]', async () => {
      const exchangeOrder = new ExchangeOrder('1815-1337', '', 'open', 337, 1331, false, undefined, 'buy', ExchangeOrder.TYPE_LIMIT);

      const logMessages: any = {
         info: [],
         error: [],
      };

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});
      pairState.setExchangeOrder(exchangeOrder);

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  findOrderById: async () => exchangeOrder,
                  updateOrder: () => new ExchangeOrder('1815-1337', '', 'canceled', 1339, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => new Ticker('exchange', 'FOOUSD', 0, 1337, 1338), //
         } as unknown as Tickers,
         {
            getConfig: (key: string, defaultValue: any) => defaultValue, //
         } as unknown as SystemUtil,
         {
            info: (message: string) => {
               logMessages.info.push(message);
            },
            error: (message: string) => {
               logMessages.error.push(message);
            },
         },
      );

      let retryOrder: any;
      executor.executeOrder = async (exchange: string, order: any) => {
         retryOrder = order;
         return order;
      };

      await executor.adjustOpenOrdersPrice(pairState);

      assert.strictEqual(retryOrder?.amount, 1331);
      assert.strictEqual(retryOrder.hasAdjustedPrice(pairState), true);

      assert.strictEqual(logMessages.error.filter((msg: string) => msg.includes('canceled recreate')).length, 1);
      assert.strictEqual(logMessages.error.filter((msg: string) => msg.includes('replacing canceled order')).length, 1);
   });

   //FIXME
   it.skip('test that price adjust order is recreated on placing error [short]', async () => {
      const exchangeOrder = new ExchangeOrder('1815-1337', '', 'open', 337, 1331, false, undefined, 'sell', ExchangeOrder.TYPE_LIMIT);

      const logMessages: any = {
         info: [],
         error: [],
      };

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});
      pairState.setExchangeOrder(exchangeOrder);

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  findOrderById: async () => exchangeOrder,
                  updateOrder: () => new ExchangeOrder('1815-1337', '', 'canceled', 1339, 0, true, undefined, 'buy', ExchangeOrder.TYPE_LIMIT),
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => new Ticker('exchange', 'FOOUSD', 0, 1337, 1338), //
         } as unknown as Tickers,
         {
            getConfig: (key: string, defaultValue: any) => defaultValue, //
         } as unknown as SystemUtil,
         {
            info: (message: string) => {
               logMessages.info.push(message);
            },
            error: (message: string) => {
               logMessages.error.push(message);
            },
         },
      );

      let retryOrder: any;
      executor.executeOrder = async (exchangeName: string, order: Order) => {
         retryOrder = order;
         return order;
      };

      await executor.adjustOpenOrdersPrice(pairState);

      assert.strictEqual(retryOrder?.amount, -1331);
      assert.strictEqual(retryOrder.hasAdjustedPrice(), true);

      assert.strictEqual(logMessages.error.filter((msg: string) => msg.includes('canceled recreate')).length, 1);
      assert.strictEqual(logMessages.error.filter((msg: string) => msg.includes('replacing canceled order')).length, 1);
   });

   it('test that price adjust order is created for short', async () => {
      const exchangeOrder = new ExchangeOrder('1815-1337', '', 'open', 0, 0, false, undefined, 'sell', ExchangeOrder.TYPE_LIMIT);

      let exchangeName: string | undefined;
      let orderUpdate: any;

      const pairState = new PairState('exchange', 'FOOUSD', 'short', {}, true, () => {});
      pairState.setExchangeOrder(exchangeOrder);

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  findOrderById: () => {
                     return new Promise((resolve) => {
                        resolve(exchangeOrder);
                     });
                  },
                  updateOrder: (myExchangeName: string, myOrderUpdate: any) => {
                     return new Promise((resolve) => {
                        exchangeName = myExchangeName;
                        orderUpdate = myOrderUpdate;

                        resolve(exchangeOrder);
                     });
                  },
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => new Ticker('exchange', 'FOOUSD', 0, 1337, 1338), //
         } as unknown as Tickers,
         undefined,
         { info: () => {}, error: () => {} },
      );

      await executor.adjustOpenOrdersPrice(pairState);

      assert.equal(orderUpdate?.price, -1338);
      assert.equal(Object.keys(executor.runningOrders).length, 0);
   });

   it('test that all orders are canceled', async () => {
      let mySymbol: string | undefined;

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  cancelAll: (symbol: string) => {
                     mySymbol = symbol;
                  },
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => {
               return new Ticker('exchange', 'FOOUSD', 0, 1337, 1338);
            },
         } as unknown as Tickers,
         undefined,
         { info: () => {}, error: () => {} },
      );

      await executor.cancelAll('FOO_EXCHANGE', 'test');

      assert.equal(mySymbol, 'test');
   });

   it('test that order is canceled', async () => {
      let mySymbol: string | undefined;

      const executor = new OrderExecutor(
         {
            get: () => {
               return {
                  cancelOrder: (symbol: string) => {
                     return new Promise((resolve: any) => {
                        mySymbol = symbol;

                        resolve();
                     });
                  },
               };
            },
         } as unknown as ExchangeManager,
         {
            getIfUpToDate: () => {
               return new Ticker('exchange', 'FOOUSD', 0, 1337, 1338);
            },
         } as unknown as Tickers,
         undefined,
         { info: () => {}, error: () => {} },
      );

      await executor.cancelOrder('FOO_EXCHANGE', '1337-ABCD');

      assert.equal(mySymbol, '1337-ABCD');
   });

   it('test that current price is injected by time', async () => {
      let i = 0;

      const executor = new OrderExecutor(
         {} as unknown as ExchangeManager,
         {
            getIfUpToDate: () => {
               return i++ > 5 ? new Ticker('exchange', 'FOOUSD', 0, 1337, 1338) : undefined;
            },
         } as unknown as Tickers,
         undefined,
         { info: () => {}, error: () => {} },
      );

      executor.tickerPriceInterval = 2;

      const price = await executor.getCurrentPrice('FOO_EXCHANGE', '1337-ABCD', 'short');

      assert.equal(i > 1, true);
      assert.equal(price, -1338);
   });
});
