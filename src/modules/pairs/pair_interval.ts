export class PairInterval {
   private intervals: { [key: string]: any } = {};

   /**
    * @param name {string}
    * @param func {() => void}
    * @param delay {number}
    */
   addInterval(name: string, delay: number, func: () => void): void {
      if (name in this.intervals) {
         clearInterval(this.intervals[name]);
      }

      setTimeout(func, 1);
      this.intervals[name] = setInterval(func, delay);
   }

   /**
    * @param name {string}
    */
   clearInterval(name: string): void {
      if (name in this.intervals) {
         clearInterval(this.intervals[name]);
         delete this.intervals[name];
      }
   }
}
