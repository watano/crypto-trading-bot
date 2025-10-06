import { describe, expect, it } from 'bun:test';
import { StrategyContext } from '~/src/dict/strategy_context';
import { Ticker } from '~/src/dict/ticker';
import { IndicatorBuilder } from '~/src/modules/strategy/dict/indicator_builder';
import { IndicatorPeriod } from '~/src/modules/strategy/dict/indicator_period';
import { ObvPumpDump } from '~/src/modules/strategy/strategies/obv_pump_dump';

describe('#strategy obv_pump_dump', () => {
   it('obv_pump_dump strategy builder', async () => {
      const indicatorBuilder = new IndicatorBuilder();
      const obv = new ObvPumpDump();

      obv.buildIndicator(indicatorBuilder);
      expect(indicatorBuilder.all().length).toBe(2);
   });

   it('obv_pump_dump strategy long', async () => {
      const obv = new ObvPumpDump();

      const result = await obv.period(
         new IndicatorPeriod(createStrategyContext(), { ema: [380, 370], obv: [-2358, -2395, -2395, -2395, -2385, -2165, -1987, -1987, -1990, -1990, -1990, -1990, -1990, -1948, -1808, -1601, -1394, -1394, -1147, 988, 3627, 6607, 11467] }),
         {},
      );

      expect(result.getSignal()).toBe('long');
      expect(result.getDebug().trend).toBe('up');
   });

   it('obv_pump_dump strategy long options', async () => {
      const obv = new ObvPumpDump();

      const result = await obv.period(
         new IndicatorPeriod(createStrategyContext(), { ema: [380, 370], obv: [-2358, -2395, -2395, -2395, -2385, -2165, -1987, -1987, -1990, -1990, -1990, -1990, -1990, -1948, -1808, -1601, -1394, -1394, -1147, 988, 3627, 6607, 11467] }),
         { trigger_multiplier: 1000 },
      );

      expect(result.getSignal()).toBeUndefined();
      expect(result.getDebug().trend).toBe('up');
   });

   const createStrategyContext = () => {
      return new StrategyContext({}, new Ticker('goo', 'goo', 0, 394, 394));
   };
});
