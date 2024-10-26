import { Position } from '~/src/dict/position';
import { ExchangeOrder } from '../dict/exchange_order';

/**
 * An dummy exchange
 *
 * @type {module.Noop}
 */
export class Noop {
   start(config: any, symbols: string[]): void {}

   getName(): string {
      return 'noop';
   }

   public async getPositionForSymbol(symbol: string): Promise<Position> {
      return new Position(symbol, 'long', 0);
   }
   public async getPositions(): Promise<Position[]> {
      return [new Position('', 'long', 0)];
   }

   public async getOrdersForSymbol(symbol: string): Promise<ExchangeOrder> {
      return new ExchangeOrder('', symbol, 'long', 0, 0, false, '', '', 'limit', new Date(), new Date());
   }
}
