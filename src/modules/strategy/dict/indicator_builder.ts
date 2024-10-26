export class IndicatorBuilder {
   private indicators: { [key: string]: { indicator: any; key: string; period: number; source: any; options: any } } = {};

   add(key: string, indicator: any, period: number, options: any = {}, source: any = {}): void {
      this.indicators[key] = {
         indicator: indicator,
         key: key,
         period: period,
         source: source,
         options: options,
      };
   }

   all(): { indicator: any; key: string; period: number; source: any; options: any }[] {
      return Object.keys(this.indicators).map((key) => this.indicators[key]);
   }
}
