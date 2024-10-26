import _ from 'lodash';
import { ExchangePosition } from '../../dict/exchange_position';

export class ExchangeManager {
   private logger: any;
   private instances: any;
   private config: any;
   private exchangesIterator: any[];
   private exchanges: any[];

   constructor(exchangesIterator: any[], logger: any, instances: any, config: any) {
      this.logger = logger;
      this.instances = instances;
      this.config = config;
      this.exchangesIterator = exchangesIterator;
      this.exchanges = [];
   }

   init(): void {
      const exchanges = this.exchangesIterator;

      const symbols: { [exchangeName: string]: string[] } = {};

      exchanges
         .map((exchange) => exchange.getName())
         .forEach((exchangeName) => {
            const pairs = this.instances.symbols.filter((symbol: any) => symbol.exchange === exchangeName);

            if (pairs.length === 0) {
               return;
            }

            symbols[exchangeName] = pairs;
         });

      const activeExchanges = exchanges.filter((exchange) => exchange.getName() in symbols);

      activeExchanges.forEach((activeExchange) => activeExchange.start(_.get(this.config, `exchanges.${activeExchange.getName()}`, {}), symbols[activeExchange.getName()]));

      this.exchanges = activeExchanges;
   }

   all(): any[] {
      return this.exchanges;
   }

   get(name: string): any {
      return this.exchanges.find((exchange) => exchange.getName() === name);
   }

   async getPosition(exchangeName: string, symbol: string): Promise<ExchangePosition | undefined> {
      const exchange = this.get(exchangeName);
      if (exchange) {
         return exchange.getPositionForSymbol(symbol);
      }
      return undefined;
   }

   async getPositions(): Promise<ExchangePosition[]> {
      const positions: ExchangePosition[] = [];

      for (const exchange of this.all()) {
         const exchangeName = exchange.getName();

         const exchangePositions = (await exchange.getPositions()).map((pos: Position) => new ExchangePosition(exchangeName, pos as any));

         positions.push(...exchangePositions);
      }

      return positions;
   }

   async getOrders(exchangeName: string, symbol: string): Promise<any[]> {
      const exchange = this.get(exchangeName);
      if (exchange) {
         return exchange.getOrdersForSymbol(symbol);
      }
      return [];
   }

   async findOrderById(exchangeName: string, id: string): Promise<any | undefined> {
      const exchange = this.get(exchangeName);
      if (exchange) {
         return exchange.findOrderById(id);
      }
      return undefined;
   }
}
