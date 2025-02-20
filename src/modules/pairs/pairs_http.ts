import _ from 'lodash';
import { ExchangeManager } from '../exchange/exchange_manager';
import { PairStateManager } from './pair_state_manager';

export class PairsHttp {
   private instances: any;
   private exchangeManager: ExchangeManager;
   private pairStateManager: PairStateManager;
   private eventEmitter: any;

   constructor(instances: any, exchangeManager: ExchangeManager, pairStateManager: PairStateManager, eventEmitter: any) {
      this.instances = instances;
      this.exchangeManager = exchangeManager;
      this.pairStateManager = pairStateManager;
      this.eventEmitter = eventEmitter;
   }

   async getTradePairs(): Promise<any[]> {
      const pairs = await Promise.all(
         this.instances.symbols.map(async (symbol: any) => {
            const position = await this.exchangeManager.getPosition(symbol.exchange, symbol.symbol);
            const state = this.pairStateManager.get(symbol.exchange, symbol.symbol);

            const strategiesTrade = symbol.trade?.strategies ? symbol.trade.strategies : [];
            const strategies = symbol.strategies || [];

            const tradeCapital = _.get(symbol, 'trade.capital', 0);
            const tradeCurrencyCapital = _.get(symbol, 'trade.currency_capital', 0);
            const tradeBalancePercent = _.get(symbol, 'trade.balance_percent', 0);

            const item: any = {
               exchange: symbol.exchange,
               symbol: symbol.symbol,
               watchdogs: symbol.watchdogs,
               is_trading: strategiesTrade.length > 0 || tradeCapital > 0 || tradeCurrencyCapital > 0 || tradeBalancePercent > 0,
               has_position: position !== undefined,
               trade_capital: tradeCapital,
               trade_currency_capital: tradeCurrencyCapital,
               trade_balance_percent: tradeBalancePercent,
               strategies: strategies,
               strategies_trade: strategiesTrade,
               weight: 0,
               strategy_names: [...strategies, ...strategiesTrade].map((s: any) => s.strategy),
            };

            // open position wins over default state
            if (item.has_position) {
               item.weight += 1;
            }

            // processing items must win
            if (state?.state) {
               item.process = state.state;
               item.weight += 2;
            }

            return item;
         }),
      );

      return pairs.sort((a: any, b: any) => `${a.exchange}.${a.symbol}`.localeCompare(`${b.exchange}.${b.symbol}`)).sort((a: any, b: any) => b.weight - a.weight);
   }

   async triggerOrder(exchangeName: string, symbol: string, action: string): Promise<void> {
      let side = action;
      const options: any = {};
      if (['long_market', 'short_market', 'close_market'].includes(action)) {
         options.market = true;
         side = side.replace('_market', '');
      }

      this.pairStateManager.update(exchangeName, symbol, side, options);

      this.eventEmitter.emit('tick_ordering');
   }
}
