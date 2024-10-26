export class Throttler {
   private logger: any;
   private tasks: { [key: string]: any } = {};

   constructor(logger: any) {
      this.logger = logger;
   }

   addTask(key: string, func: () => Promise<void>, timeout: number = 1000): void {
      if (func.constructor.name !== 'AsyncFunction') {
         throw new Error(`Throttler no async function given: ${key}`);
      }

      if (key in this.tasks) {
         this.logger.debug(`Throttler already existing task: ${key} - ${timeout}ms`);
         return;
      }

      this.tasks[key] = setTimeout(async () => {
         delete this.tasks[key];
         try {
            await func();
         } catch (e) {
            this.logger.error(`Task error: ${key} - ${String(e)}`);
         }
      }, timeout);
   }
}
