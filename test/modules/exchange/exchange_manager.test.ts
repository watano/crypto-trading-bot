import { describe, expect, it } from 'bun:test';
import { ExchangeOrder } from '~/src/dict/exchange_order';
import { Position } from '~/src/dict/position';
import { Noop } from '~/src/exchange/noop';
import { ExchangeManager } from '~/src/modules/exchange/exchange_manager';

describe('#exchange manager', () => {
   it('test that exchanges are initialized', () => {
      const symbols = [{ symbol: 'BTCUSD', periods: ['1m', '15m', '1h'], exchange: 'noop', state: 'watch' }, { symbol: 'BTCUSD', periods: ['1m', '15m', '1h'], exchange: 'FOOBAR', state: 'watch' }];

      const config = { noop: { key: 'foobar', secret: 'foobar' } };

      const exchangeManager = new ExchangeManager([new Noop()], {}, { symbols: symbols }, { exchanges: config });

      exchangeManager.init();

      expect(exchangeManager.all().map((exchange) => exchange.getName()).sort()).toEqual(['noop']);

      expect(exchangeManager.get('noop')?.getName()).toBe('noop');
      expect(exchangeManager.get('UNKNOWN')).toBeUndefined();
   });

   it('test positions and orders', async () => {
      const symbols = [{ symbol: 'BTCUSD', periods: ['1m', '15m', '1h'], exchange: 'noop', state: 'watch' }];

      const config = { noop: { key: 'foobar', secret: 'foobar' } };

      const exchange = new Noop();
      exchange.getPositionForSymbol = async (symbol: string) =>
         new Position(
            symbol, //
            'long',
            1,
            0,
            new Date(),
            100,
            new Date(),
            { stop: 0.9 },
         );
      exchange.getPositions = async () => [new Position('BTCUSDT', 'long', 1, 0, new Date(), 100, new Date(), { stop: 0.9 })];
      exchange.getOrdersForSymbol = async (symbol: string) => new ExchangeOrder('25035356', symbol, 'open', 1, 0, false, undefined, 'buy', ExchangeOrder.TYPE_LIMIT);

      const exchangeManager = new ExchangeManager([exchange], {}, { symbols: symbols }, { exchanges: config });

      exchangeManager.init();

      const position = await exchangeManager.getPosition('noop', 'BTCUSD');
      expect(position?.getSymbol()).toBe('BTCUSD');

      const order = await exchangeManager.getOrders('noop', 'BTCUSD');
      // FIXME
      // expect(order[0]?.symbol).toBe('BTCUSD');

      const positions = await exchangeManager.getPositions();
      expect(positions[0].getExchange()).toBe('noop');
      expect(positions[0].getSymbol()).toBe('BTCUSDT');
      expect(positions[0].getPosition().symbol).toBe('BTCUSDT');
   });
});
