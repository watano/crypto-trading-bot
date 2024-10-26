import { describe, expect, it } from 'bun:test';
import { StrategyContext } from '~/src/dict/strategy_context';
import { Ticker } from '~/src/dict/ticker';
import { IndicatorBuilder } from '~/src/modules/strategy/dict/indicator_builder';
import { IndicatorPeriod } from '~/src/modules/strategy/dict/indicator_period';
import { CCI } from '~/src/modules/strategy/strategies/cci';

describe('#strategy cci', () => {
   it('cci indicator builder', async () => {
      const indicatorBuilder = new IndicatorBuilder();
      const cci = new CCI();

      cci.buildIndicator(indicatorBuilder, { period: '15m' });
      expect(indicatorBuilder.all().length).toBe(3);
   });

   it('strategy cci short', async () => {
      const cci = new CCI();

      const result = await cci.period(
         new IndicatorPeriod(createStrategyContext(394), {
            sma200: [500, 400, 300],
            ema200: [500, 400, 300],
            cci: [90, 100, 110, 130, 150, 180, 200, 220, 280, 220, 200, 180, 150, 130, 90, 80],
         }),
      );

      expect(result.getSignal()).toBe('short');
      expect(result.getDebug()._trigger).toBe(280);

      const result2 = await cci.period(
         new IndicatorPeriod(createStrategyContext(394), {
            sma200: [500, 400],
            ema200: [500, 400],
            cci: [80, 90, 100, 110, 130, 150, 180, 190, 199, 180, 150, 130, 90, 80],
         }),
      );

      expect(result2.getSignal()).toBeUndefined();
   });

   it('strategy cci long', async () => {
      const cci = new CCI();

      const result = await cci.period(
         new IndicatorPeriod(createStrategyContext(404), {
            sma200: [550, 400, 388],
            ema200: [550, 400, 388],
            cci: [-80, -90, -100, -110, -130, -150, -180, -200, -220, -280, -220, -200, -180, -150, -130, -90, -80],
         }),
      );

      expect(result.getSignal()).toBe('long');
      expect(result.getDebug()._trigger).toBe(-280);

      const result2 = await cci.period(
         new IndicatorPeriod(createStrategyContext(404), {
            sma200: [500, 400, 388],
            ema200: [500, 400, 388],
            cci: [-80, -90, -100, -110, -130, -150, -180, -190, -199, -180, -150, -130, -90, -80],
         }),
      );

      expect(result2.getSignal()).toBeUndefined();

      const result3 = await cci.period(
         new IndicatorPeriod(createStrategyContext(404), {
            sma200: [900, 900, 900],
            ema200: [500, 400, 388],
            cci: [-80, -90, -100, -110, -130, -150, -180, -200, -220, -280, -220, -200, -180, -150, -130, -90, -80],
         }),
      );

      expect(result3.getSignal()).toBe('long');
      expect(result3.getDebug()._trigger).toBe(-280);
   });

   it('strategy cci long [close]', async () => {
      const cci = new CCI();

      const strategyContext = createStrategyContext(404);
      strategyContext.lastSignal = 'long';

      const result = await cci.period(
         new IndicatorPeriod(strategyContext, {
            sma200: [550, 400, 388],
            ema200: [550, 400, 388],
            cci: [120, 80, -1],
         }),
      );

      expect(result.getSignal()).toBe('close');

      const result2 = await cci.period(
         new IndicatorPeriod(strategyContext, {
            sma200: [550, 400, 388],
            ema200: [550, 400, 388],
            cci: [120, 150, -1],
         }),
      );

      expect(result2.getSignal()).toBeUndefined();
   });

   it('strategy cci short [close]', async () => {
      const cci = new CCI();

      const strategyContext = createStrategyContext(404);
      strategyContext.lastSignal = 'short';

      const result = await cci.period(
         new IndicatorPeriod(strategyContext, {
            sma200: [550, 400, 388],
            ema200: [550, 400, 388],
            cci: [-120, -80, 1],
         }),
      );

      expect(result.getSignal()).toBe('close');

      const result2 = await cci.period(
         new IndicatorPeriod(strategyContext, {
            sma200: [550, 400, 388],
            ema200: [550, 400, 388],
            cci: [-120, -150, -1],
         }),
      );

      expect(result2.getSignal()).toBeUndefined();
   });

   const createStrategyContext = (price: number) => {
      return new StrategyContext({}, new Ticker('goo', 'goo', 0, price, 0));
   };
});
