import { describe, expect, it } from 'bun:test';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { OrderBag } from '~/src/exchange/utils/order_bag';

describe('#order bag utils', () => {
   it('test non strict handling non id type', async () => {
      const orderBag = new OrderBag();

      orderBag.triggerOrder(
         new ExchangeOrder(
            '12345', //
            'BCHBTC',
            'open',
            0,
            0,
            false,
            undefined,
            'short',
            ExchangeOrder.TYPE_LIMIT,
         ),
      );

      const newVar = await orderBag.findOrderById('12345');
      expect(newVar?.id).toBe('12345');

      orderBag.triggerOrder(
         new ExchangeOrder(
            '12345', //
            'BCHBTC',
            ExchangeOrder.STATUS_CANCELED,
            0,
            0,
            false,
            undefined,
            'short',
            ExchangeOrder.TYPE_LIMIT,
         ),
      );

      expect(await orderBag.findOrderById('12345')).toBeUndefined();
   });

   it('test non strict handling non id type get', async () => {
      const orderBag = new OrderBag();

      orderBag.triggerOrder(
         new ExchangeOrder(
            '12345', //
            'BCHBTC',
            'open',
            0,
            0,
            false,
            undefined,
            'short',
            ExchangeOrder.TYPE_LIMIT,
         ),
      );

      expect((await orderBag.findOrderById('12345'))?.id).toBe('12345');
      expect((await orderBag.findOrderById('12345'))?.id).toBe('12345');

      expect(orderBag.get('12345')?.id).toBe('12345');
      expect(orderBag.get('12345')?.id).toBe('12345');
   });

   it('test non strict handling non id type set', async () => {
      const orderBag = new OrderBag();

      orderBag.set([
         new ExchangeOrder(
            '12345', //
            'BCHBTC',
            'open',
            0,
            0,
            false,
            undefined,
            'short',
            ExchangeOrder.TYPE_LIMIT,
         ),
         new ExchangeOrder(
            '12346', //
            'BCHBTC',
            'open',
            0,
            0,
            false,
            undefined,
            'short',
            ExchangeOrder.TYPE_LIMIT,
         ),
      ]);

      expect((await orderBag.findOrderById('12345'))?.id).toBe('12345');
      expect((await orderBag.findOrderById('12345'))?.id).toBe('12345');

      expect(orderBag.get('12345')?.id).toBe('12345');
      expect(orderBag.get('12345')?.id).toBe('12345');

      orderBag.delete('12345');
      expect(orderBag.get('12345')).toBeUndefined();

      expect(orderBag.all()[0]?.id).toBe('12346');
   });
});
