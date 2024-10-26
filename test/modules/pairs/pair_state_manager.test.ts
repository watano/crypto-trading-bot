import { describe, expect, it } from 'bun:test';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { Order } from '~/src/dict/order';
import { OrderCapital } from '~/src/dict/order_capital';
import { PairState } from '~/src/dict/pair_state';
import { PairConfig } from '~/src/modules/pairs/pair_config';
import { PairInterval } from '~/src/modules/pairs/pair_interval';
import { PairStateExecution } from '~/src/modules/pairs/pair_state_execution';
import { PairStateManager } from '~/src/modules/pairs/pair_state_manager';
import { SystemUtil } from '~/src/modules/system/system_util';

describe('#pair state manager', () => {
   it.skip('test pair state changes', () => {
      const manager = new PairStateManager(
         { info: () => {}, debug: () => {} },
         { getSymbolCapital: () => OrderCapital.createAsset(12) } as unknown as PairConfig, //
         { getConfig: () => 1 } as unknown as SystemUtil,
         {} as unknown as PairStateExecution,
         {},
      );

      manager.update('foo1', 'BTCUSD2', 'long', { foobar: 'test' });
      manager.update('foo2', 'BTCUSD3', 'short', { foobar: 'test' });
      manager.update('foo3', 'BTCUSD4', 'close', { foobar: 'test' });
      manager.update('foo4', 'BTCUSD5', 'cancel', { foobar: 'test' });

      expect(manager.isNeutral('foo', 'BTCUSD')).toBe(true);
      expect(manager.get('foo1', 'BTCUSD2')?.exchange).toBe('foo1');

      expect(manager.getBuyingPairs()[0].symbol).toBe('BTCUSD2');
      expect(manager.getSellingPairs()[0].symbol).toBe('BTCUSD3');
      expect(manager.getClosingPairs()[0].symbol).toBe('BTCUSD4');
      expect(manager.getCancelPairs()[0].symbol).toBe('BTCUSD5');

      expect(manager.isNeutral('foo1', 'BTCUSD2')).toBe(false);
      expect(manager.isNeutral('foo2', 'BTCUSD3')).toBe(false);

      manager.clear('UNKNOWN', 'FOOBAR');
      manager.clear('foo2', 'BTCUSD3');

      expect(manager.isNeutral('foo2', 'BTCUSD3')).toBe(true);
      expect(manager.isNeutral('UNKNOWN', 'FOOBAR')).toBe(true);

      const state: any = manager.get('foo4', 'BTCUSD5');
      state.setOrder(Order.createMarketOrder('FOO', 0));
      state.setExchangeOrder(
         new ExchangeOrder(
            '25035356', //
            'FOOUSD',
            'open',
            0,
            0,
            false,
            undefined,
            'buy',
            ExchangeOrder.TYPE_LIMIT,
         ),
      );

      expect(manager.get('foo4', 'BTCUSD5')?.getExchangeOrder()?.getSymbol()).toBe('FOOUSD');
      expect(manager.get('foo4', 'BTCUSD5')?.exchangeOrder?.getSymbol()).toBe('FOOUSD');
   });

   it('test pair state should be cleared', () => {
      const manager = new PairStateManager(
         {
            info: () => {}, //
            debug: () => {},
         },
         { getSymbolCapital: () => OrderCapital.createAsset(12) } as unknown as PairConfig,
         { getConfig: () => 1 } as unknown as SystemUtil,
         {} as unknown as PairStateExecution,
         { addInterval: () => {}, clearInterval: () => {} },
      );

      manager.update('foo1', 'BTCUSD2', 'long', { foobar: 'test' });
      const state = manager.get('foo1', 'BTCUSD2');
      if (state) {
         expect(state.getSymbol()).toBe('BTCUSD2');

         expect(state.clear()).toBeUndefined();
      }
   });

   it.skip('test pair state provides callback and calls internal functions', async () => {
      let addIntervalCallback: any;

      let onPairStateExecutionTick: PairState | undefined;
      let adjustOpenOrdersPrice: PairState | undefined;

      const manager = new PairStateManager(
         { info: () => {}, debug: () => {} },
         { getSymbolCapital: () => OrderCapital.createAsset(12) } as unknown as PairConfig,
         { getConfig: () => 1 } as unknown as SystemUtil,
         {
            onPairStateExecutionTick: (pairState: PairState) => {
               onPairStateExecutionTick = pairState;
            },
         } as PairStateExecution,
         {
            adjustOpenOrdersPrice: (pairState: PairState) => {
               adjustOpenOrdersPrice = pairState;
            },
         },
      );

      manager.update('foo1', 'BTCUSD2', 'long', { foobar: 'test' });

      // await addIntervalCallback();
      //FIXME
      //expect(onPairStateExecutionTick?.getSymbol()).toBe('BTCUSD2');
      //expect(adjustOpenOrdersPrice?.getSymbol()).toBe('BTCUSD2');
   });
});
