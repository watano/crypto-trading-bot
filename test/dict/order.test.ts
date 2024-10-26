import { describe, expect, it } from 'bun:test';
import { Order } from '~/src/dict/order';

describe('#order dict test', () => {
   it('test order dict creation (post only)', () => {
      const order = Order.createLimitPostOnlyOrder('BTCUSD', 'long', 12, 12, { foobar: 'test' });

      expect(order.options.foobar).toBe('test');
      expect(order.options.post_only).toBe(true);
   });

   it('test order dict creation (post only + adjusted) [long]', () => {
      const order = Order.createLimitPostOnlyOrderAutoAdjustedPriceOrder('BTCUSD', 12);

      expect(order.price).toBe(0);
      expect(order.options.adjust_price).toBe(true);
      expect(order.amount).toBe(12);
      expect(order.side).toBe('long');

      expect(order.hasAdjustedPrice()).toBe(true);
   });

   it('test order dict creation (post only + adjusted) [short]', () => {
      const order = Order.createLimitPostOnlyOrderAutoAdjustedPriceOrder('BTCUSD', -12);

      expect(order.price).toBe(0);
      expect(order.options.adjust_price).toBe(true);
      expect(order.amount).toBe(-12);
      expect(order.side).toBe('short');

      expect(order.hasAdjustedPrice()).toBe(true);
   });

   it('test order close creation', () => {
      const order = Order.createCloseOrderWithPriceAdjustment('BTCUSD', -12);

      expect(order.price).toBe(0);
      expect(order.options.adjust_price).toBe(true);
      expect(order.options.close).toBe(true);

      expect(order.side).toBe('short');
      expect(order.hasAdjustedPrice()).toBe(true);
      expect(order.options).toEqual({ close: true, adjust_price: true, post_only: true });

      expect(Order.createCloseOrderWithPriceAdjustment('BTCUSD', 12).side).toBe('long');
   });

   it('test order close creation for closes', () => {
      const order = Order.createCloseLimitPostOnlyReduceOrder('BTCUSD', -12, 0.4);

      expect(order.symbol).toBe('BTCUSD');
      expect(order.price).toBe(-12);
      expect(order.amount).toBe(0.4);

      expect(order.side).toBe('short');
      expect(order.options).toEqual({ close: true, post_only: true });
   });

   it('test market order', () => {
      let order = Order.createMarketOrder('BTCUSD', -12);

      expect(order.price < 0).toEqual(true);
      expect(order.side).toEqual('short');

      order = Order.createMarketOrder('BTCUSD', 12);

      expect(order.price > 0).toEqual(true);
      expect(order.side).toEqual('long');
   });

   it('test retry order', () => {
      const order = Order.createRetryOrder(Order.createMarketOrder('BTCUSD', 12));

      expect(order.price > 0).toEqual(true);
      expect(order.side).toEqual('long');
      expect(order.amount).toEqual(12);
   });

   it('test retry order with amount [long]', () => {
      let order = Order.createRetryOrder(Order.createMarketOrder('BTCUSD', 12), -16);

      expect(order.price > 0).toEqual(true);
      expect(order.side).toEqual('long');
      expect(order.amount).toEqual(16);

      order = Order.createRetryOrder(Order.createMarketOrder('BTCUSD', 12), 16);

      expect(order.price > 0).toEqual(true);
      expect(order.side).toEqual('long');
      expect(order.amount).toEqual(16);
   });

   it('test retry order with amount [short]', () => {
      let order = Order.createRetryOrder(Order.createMarketOrder('BTCUSD', -12), -16);

      expect(order.price > 0).toEqual(false);
      expect(order.side).toEqual('short');
      expect(order.amount).toEqual(-16);

      order = Order.createRetryOrder(Order.createMarketOrder('BTCUSD', -12), 16);

      expect(order.price > 0).toEqual(false);
      expect(order.side).toEqual('short');
      expect(order.amount).toEqual(-16);
   });
});
