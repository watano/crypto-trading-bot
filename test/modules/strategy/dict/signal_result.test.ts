import { describe, expect, it } from 'bun:test';
import { SignalResult } from '~/src/modules/strategy/dict/signal_result';

describe('#test signal object', () => {
   it('test that signal state is correct', () => {
      const signal = new SignalResult();

      expect(signal.getSignal()).toBeUndefined();
      expect(signal.getDebug()).toEqual({});

      signal.setSignal('short');
      expect(signal.getSignal()).toBe('short');

      signal.mergeDebug({ test: 'foobar' });
      signal.addDebug('test2', 'test');
      signal.addDebug('test', 'foobar2');
      signal.mergeDebug({ test3: 'foobar', test5: 'foobar' });

      expect(signal.getDebug()).toEqual({ test: 'foobar2', test2: 'test', test3: 'foobar', test5: 'foobar' });
   });
});
