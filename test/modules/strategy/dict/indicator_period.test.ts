import { describe, expect, it } from 'bun:test';
import { IndicatorPeriod } from '~/src/modules/strategy/dict/indicator_period';

describe('#test indicator', () => {
   it('test that yield visiting is possible', () => {
      const ip = new IndicatorPeriod(
         {},
         {
            macd: [{ test: 'test1' }, { test: 'test2' }, { test: 'test3' }],
            sma: [1, 2, 3, 4, 5],
         },
      );

      const calls: any[] = [];

      for (const value of ip.visitLatestIndicators()) {
         calls.push(value);

         if (calls.length > 1) {
            break;
         }
      }

      expect({ macd: { test: 'test3' }, sma: 5 }).toEqual(calls[0]);
      expect({ macd: { test: 'test2' }, sma: 4 }).toEqual(calls[1]);
   });

   it('test that helper for latest elements are given', () => {
      const ip = new IndicatorPeriod(
         {},
         {
            macd: [{ test: 'test1' }, { test: 'test2' }, { test: 'test3' }],
            sma: [1, 2, 3, 4, 5],
         },
      );

      expect({ macd: { test: 'test3' }, sma: 5 }).toEqual(ip.getLatestIndicators());
      expect(5).toEqual(ip.getLatestIndicator('sma'));
   });
});
