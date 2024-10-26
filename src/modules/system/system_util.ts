import _ from 'lodash';

export class SystemUtil {
   constructor(public config: any) {}

   getConfig(key: string, defaultValue: any = undefined) {
      const value = _.get(this.config, key, defaultValue);

      if (value === null) {
         return defaultValue;
      }

      return value;
   }
}
