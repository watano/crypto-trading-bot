import { SignalResult } from '../dict/signal_result';

export class PARABOL {
   getName(): string {
      return 'parabol';
   }

   buildIndicator(indicatorBuilder: any, options: any): void {
      if (!options.period) {
         throw new Error('Invalid period');
      }

      indicatorBuilder.add('psar', 'PSAR', options.period, options);
   }

   period(indicatorPeriod: any): SignalResult | undefined {
      const psar = indicatorPeriod.getIndicator('psar');
      const psarVal = psar.result;
      const price = indicatorPeriod.getPrice();
      const diff = price - psarVal;

      const lastSignal = indicatorPeriod.getLastSignal();

      const long = diff > 0;

      const debug = {
         psar: psar[0],
         histogram: psar[0].histogram,
         last_signal: lastSignal,
         long: long,
      };

      const current = psar[0].histogram;
      const before = psar[1].histogram;

      // trend change
      if ((lastSignal === 'long' && before > 0 && current < 0) || (lastSignal === 'short' && before < 0 && current > 0)) {
         return SignalResult.createSignal('close', debug);
      }

      if (long) {
         // long
         if (before < 0 && current > 0) {
            return SignalResult.createSignal('long', debug);
         }
      } else {
         // short
         if (before > 0 && current < 0) {
            return SignalResult.createSignal('short', debug);
         }
      }

      return SignalResult.createEmptySignal(debug);
   }

   getBacktestColumns(): any[] {
      return [
         {
            label: 'trend',
            value: (row: any) => {
               if (typeof row.long !== 'boolean') {
                  return undefined;
               }

               return row.long === true ? 'success' : 'danger';
            },
            type: 'icon',
         },
         {
            label: 'histogram',
            value: 'histogram',
            type: 'histogram',
         },
      ];
   }

   getOptions(): any {
      return {
         period: '15m',
      };
   }
}
