import { describe, expect, it } from 'bun:test';
import assert from 'node:assert';
import moment from 'moment';
import { TechnicalAnalysisValidator } from '~/src/utils/technical_analysis_validator';

describe('#technical analysis validation for candles', () => {
   it('test that last candle is up to date', async () => {
      const result = new TechnicalAnalysisValidator().isValidCandleStickLookback(
         [
            {
               time: moment()
                  .minute(Math.floor(moment().minute() / 15) * 15)
                  .second(0)
                  .unix(),
            },
            {
               time: moment()
                  .minute(Math.floor(moment().minute() / 15) * 15)
                  .second(0)
                  .subtract(15, 'minutes')
                  .unix(),
            },
         ],
         '15m',
      );

      assert.strictEqual(result, true);
   });

   it('test that last candle is outdated', async () => {
      const result = new TechnicalAnalysisValidator().isValidCandleStickLookback(
         [
            {
               time: moment()
                  .minute(Math.floor(moment().minute() / 15) * 15)
                  .second(0)
                  .subtract(1, 'hour')
                  .unix(),
            },
            {
               time: moment()
                  .minute(Math.floor(moment().minute() / 15) * 15)
                  .second(0)
                  .subtract(1, 'hour')
                  .subtract(15, 'minutes')
                  .unix(),
            },
         ],
         '15m',
      );

      assert.strictEqual(result, false);
   });
});
