import { Order } from '../../dict/order';
import { Tickers } from '../../storage/tickers';
import * as orderUtil from '../../utils/order_util';

export class ExchangeOrderWatchdogListener {
   constructor(public exchangeManager: any, public instances: any, public stopLossCalculator: any, public riskRewardRatioCalculator: any, public orderExecutor: any, public pairStateManager: any, public logger: any, public tickers: Tickers) {}

   async onTick() {
      const instances = this.instances;

      for (const exchange of this.exchangeManager.all()) {
         const positions = await exchange.getPositions();

         if (positions.length === 0) {
            continue;
         }

         for (const position of positions) {
            const pair = instances.symbols.find((instance: any) => instance.exchange === exchange.getName() && instance.symbol === position.symbol);

            if (!pair || !pair.watchdogs) {
               continue;
            }

            if (!this.pairStateManager.isNeutral(exchange.getName(), position.symbol)) {
               this.logger.debug(`Watchdog: block for action in place: ${JSON.stringify({ exchange: exchange.getName(), symbol: position.symbol })}`);
               continue;
            }

            const stopLoss = pair.watchdogs.find((watchdog: any) => watchdog.name === 'stoploss');
            if (stopLoss) {
               await this.stopLossWatchdog(exchange, position, stopLoss);
            }

            const riskRewardRatio = pair.watchdogs.find((watchdog: any) => watchdog.name === 'risk_reward_ratio');
            if (riskRewardRatio) {
               await this.riskRewardRatioWatchdog(exchange, position, riskRewardRatio);
            }

            const stoplossWatch = pair.watchdogs.find((watchdog: any) => watchdog.name === 'stoploss_watch');
            if (stoplossWatch) {
               await this.stoplossWatch(exchange, position, stoplossWatch);
            }

            const trailingStoplossWatch = pair.watchdogs.find((watchdog: any) => watchdog.name === 'trailing_stop');
            if (trailingStoplossWatch) {
               await this.trailingStoplossWatch(exchange, position, trailingStoplossWatch);
            }
         }
      }
   }

   async onPositionChanged(positionStateChangeEvent: any) {
      if (!positionStateChangeEvent.isClosed()) {
         return;
      }

      const exchangeName = positionStateChangeEvent.getExchange();
      const symbol = positionStateChangeEvent.getSymbol();

      const pair = this.instances.symbols.find((instance: any) => instance.exchange === exchangeName && instance.symbol === symbol);

      if (!pair || !pair.watchdogs) {
         return;
      }

      const found = pair.watchdogs.find((watchdog: any) => ['trailing_stop', 'stoploss', 'risk_reward_ratio'].includes(watchdog.name));
      if (!found) {
         return;
      }

      this.logger.info(`Watchdog: position closed cleanup orders: ${JSON.stringify([exchangeName, symbol])}`);
      await this.orderExecutor.cancelAll(exchangeName, positionStateChangeEvent.getSymbol());
   }

   async stopLossWatchdog(exchange: any, position: any, stopLoss: any) {
      const logger = this.logger;
      const stopLossCalculator = this.stopLossCalculator;

      const orders = await exchange.getOrdersForSymbol(position.getSymbol());
      const orderChanges = orderUtil.syncStopLossOrder(position, orders);

      for (const orderChange of orderChanges) {
         logger.info(`Stoploss update: ${JSON.stringify({ order: orderChange, symbol: position.getSymbol(), exchange: exchange.getName() })}`);

         if (orderChange.id) {
            let amount = Math.abs(orderChange.amount);
            if (position.isLong()) {
               amount *= -1;
            }

            try {
               await exchange.updateOrder(orderChange.id, Order.createUpdateOrder(orderChange.id, 0, amount));
            } catch (e) {
               logger.error(`Stoploss update error${JSON.stringify({ error: e, orderChange: orderChange })}`);
            }

            continue;
         }

         let price = stopLossCalculator.calculateForOpenPosition(exchange.getName(), position, stopLoss);
         if (!price) {
            console.log('Stop loss: auto price skipping');
            continue;
         }

         price = exchange.calculatePrice(price, position.getSymbol());
         if (!price) {
            console.log('Stop loss: auto price skipping');
            continue;
         }

         const order = Order.createStopLossOrder(position.getSymbol(), price, orderChange.amount);

         try {
            await exchange.order(order);
         } catch (e) {
            logger.error(`Stoploss create${JSON.stringify({ error: e, order: order })}`);
         }
      }
   }

   async riskRewardRatioWatchdog(exchange: any, position: any, riskRewardRatioOptions: any) {
      const logger = this.logger;

      const symbol = position.getSymbol();
      const orders = await exchange.getOrdersForSymbol(symbol);
      const orderChanges = await this.riskRewardRatioCalculator.createRiskRewardOrdersOrders(position, orders, riskRewardRatioOptions);

      for (const orderChange of orderChanges) {
         logger.info(`Risk Reward: needed order change detected: ${JSON.stringify({ orderChange: orderChange, symbol: symbol, exchange: exchange.getName() })}`);

         if (orderChange.id && String(orderChange.id).length > 0) {
            logger.info(`Risk Reward: order update: ${JSON.stringify({ orderChange: orderChange, symbol: symbol, exchange: exchange.getName() })}`);

            try {
               await exchange.updateOrder(orderChange.id, Order.createUpdateOrder(orderChange.target.id, orderChange.target.price || undefined, orderChange.target.amount || undefined));
            } catch (e) {
               logger.error(`Risk Reward: order update error: ${JSON.stringify({ orderChange: orderChange, symbol: symbol, exchange: exchange.getName(), message: e })}`);
            }

            continue;
         }

         const price = exchange.calculatePrice(orderChange.price, symbol);
         if (!price) {
            logger.error(`Risk Reward: Invalid price: ${JSON.stringify({ orderChange: orderChange, symbol: symbol, exchange: exchange.getName() })}`);

            continue;
         }

         const ourOrder = orderChange.type === 'stop' ? Order.createStopLossOrder(symbol, orderChange.price, orderChange.amount) : Order.createCloseLimitPostOnlyReduceOrder(symbol, orderChange.price, orderChange.amount);

         ourOrder.price = price;

         await this.orderExecutor.executeOrder(exchange.getName(), ourOrder);
      }
   }

   async stoplossWatch(exchange: any, position: any, config: any) {
      if (!config.stop || config.stop < 0.1 || config.stop > 50) {
         this.logger.error('Stoploss Watcher: invalid stop configuration need "0.1" - "50"');
         return;
      }

      if (typeof position.entry === 'undefined') {
         this.logger.error(`Stoploss Watcher: no entry for position: ${JSON.stringify(position)}`);
         return;
      }

      const ticker = this.tickers.get(exchange.getName(), position.symbol);
      if (!ticker) {
         this.logger.error(`Stoploss Watcher: no ticker found ${JSON.stringify([exchange.getName(), position.symbol])}`);
         return;
      }

      let profit = 0;
      const stopProfit = Number.parseFloat(config.stop);
      if (position.side === 'long') {
         if (ticker.bid < position.entry) {
            profit = (ticker.bid / position.entry - 1) * 100;
         }
      } else if (position.side === 'short') {
         if (ticker.ask > position.entry) {
            profit = (position.entry / ticker.ask - 1) * 100;
         }
      } else {
         throw new Error('Invalid side');
      }

      if (typeof profit === 'undefined' || profit > 0) {
         return;
      }

      const maxLoss = Math.abs(stopProfit) * -1;
      if (profit < maxLoss) {
         this.logger.info(`Stoploss Watcher: stop triggered: ${JSON.stringify([exchange.getName(), position.symbol, maxLoss.toFixed(2), profit.toFixed(2)])}`);
         this.pairStateManager.update(exchange.getName(), position.symbol, 'close');
      }
   }

   async trailingStoplossWatch(exchange: any, position: any, config: any) {
      const logger = this.logger;
      const stopLossCalculator = this.stopLossCalculator;

      if (!config.target_percent || config.target_percent < 0.1 || config.target_percent > 50 || !config.stop_percent || config.stop_percent < 0.1 || config.stop_percent > 50) {
         logger.error('Stoploss Watcher: invalid stop configuration need "0.1" - "50"');
         return;
      }

      if (typeof position.entry === 'undefined') {
         logger.error(`Stoploss Watcher: no entry for position: ${JSON.stringify(position)}`);
         return;
      }

      const orders = await exchange.getOrdersForSymbol(position.symbol);
      const orderChanges = orderUtil.syncTrailingStopLossOrder(position, orders);

      await Promise.all(orderChanges.map(async (orderChange) => {
         if (orderChange.id) {
            let amount = Math.abs(orderChange.amount);
            if (position.isLong()) {
               amount *= -1;
            }

            return exchange.updateOrder(orderChange.id, Order.createUpdateOrder(orderChange.id, 0, amount));
         }

         const activationPrice = await stopLossCalculator.calculateForOpenPosition(exchange.getName(), position, { percent: -config.target_percent });

         if (!activationPrice) {
            return undefined;
         }

         const exchangeSymbol = position.symbol.substring(0, 3).toUpperCase();
         let trailingOffset = (activationPrice * Number.parseFloat(config.stop_percent)) / 100;
         trailingOffset = exchange.calculatePrice(trailingOffset, exchangeSymbol);
         const order = Order.createTrailingStopLossOrder(position.symbol, trailingOffset, orderChange.amount);

         return exchange.order(order);
      })).then((results) => {
         logger.info(`Trailing stop loss: ${JSON.stringify({ results: results, exchange: exchange.getName() })}`);
      }).catch((e) => {
         logger.error(`Trailing stoploss create${JSON.stringify(e)}`);
      });
   }
}
