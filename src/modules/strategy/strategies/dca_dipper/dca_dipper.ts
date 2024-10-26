import { SignalResult } from '../../dict/signal_result';

export class DcaDipper {
   getName(): string {
      return 'dca_dipper';
   }

   buildIndicator(indicatorBuilder: any, options: any): void {
      // basic price normalizer
      indicatorBuilder.add('hma', 'hma', options.period, {
         length: options.hma_period || 9,
         source: options.hma_source || 'close',
      });

      indicatorBuilder.add('bb', 'bb', options.period, {
         length: options.bb_length || 20,
         stddev: options.bb_stddev || 2,
      });
   }

   async period(indicatorPeriod: any): Promise<SignalResult> {
      const currentValues = indicatorPeriod.getLatestIndicators();

      const price = indicatorPeriod.getPrice();
      if (!price) {
         throw new Error('No price given');
      }

      const context = indicatorPeriod.getStrategyContext();
      const options = context.getOptions();

      if (!options.amount_currency) {
         throw new Error('No amount_currency given');
      }

      const hma = indicatorPeriod.getIndicator('hma').slice(-2);
      const bb = indicatorPeriod.getIndicator('bb').slice(-2);

      if (bb.length < 2 || hma.length < 2) {
         return SignalResult.createEmptySignal(currentValues);
      }

      let shouldBuy = false;
      if (hma[0] > bb[0].lower && hma[1] < bb[1].lower) {
         shouldBuy = true;
      }

      const emptySignal = SignalResult.createEmptySignal(currentValues);
      emptySignal.addDebug('buy', shouldBuy);

      if (shouldBuy) {
         // percent below current price
         const orderPrice = options.percent_below_price && options.percent_below_price > 0 ? price * (1 - options.percent_below_price / 100) : price;

         emptySignal.addDebug('price', orderPrice);

         // give feedback on backtest via chart
         if (context.isBacktest()) {
            emptySignal.setSignal('long');
         }

         emptySignal.placeBuyOrder(options.amount_currency, orderPrice);
      }

      return emptySignal;
   }

   getBacktestColumns(): any[] {
      return [
         {
            label: 'buy',
            value: (row: any) => {
               if (row.buy) {
                  return 'success';
               }
               return undefined;
            },
            type: 'icon',
         },
         {
            label: 'price',
            value: 'price',
         },
      ];
   }

   getOptions(): any {
      return {
         period: '15m',
         amount_currency: '12',
         percent_below_price: 0.1,
         hma_period: 9,
         hma_source: 'close',
         bb_length: 20,
         bb_stddev: 2,
      };
   }
}
