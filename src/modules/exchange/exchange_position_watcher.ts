import _ from 'lodash';
import { PositionStateChangeEvent } from '../../event/position_state_change_event';

export class ExchangePositionWatcher {
   private exchangeManager: any;
   private eventEmitter: any;
   private logger: any;
   public positions: { [key: string]: any };
   private init: boolean;

   constructor(exchangeManager: any, eventEmitter: any, logger: any) {
      this.exchangeManager = exchangeManager;
      this.eventEmitter = eventEmitter;
      this.logger = logger;
      this.positions = {};
      this.init = false;
   }

   async onPositionStateChangeTick(): Promise<void> {
      const positions = await this.exchangeManager.getPositions();

      // First run after start
      if (!this.init) {
         positions.forEach((position: any) => {
            this.positions[position.getKey()] = position;
         });

         this.init = true;
      }

      const currentOpen: string[] = [];

      for (const position of positions) {
         const key = position.getKey();
         currentOpen.push(key);

         if (!(key in this.positions)) {
            // New position
            this.logger.info(`Position opened: ${JSON.stringify([position.getExchange(), position.getSymbol(), position])}`);
            this.positions[position.getKey()] = position;
            this.eventEmitter.emit(PositionStateChangeEvent.EVENT_NAME, PositionStateChangeEvent.createOpened(position));
         }
      }

      for (const [key, position] of Object.entries(this.positions)) {
         if (!currentOpen.includes(key)) {
            // Closed position
            this.logger.info(`Position closed: ${JSON.stringify([position.getExchange(), position.getSymbol(), position])}`);

            delete this.positions[key];
            this.eventEmitter.emit(PositionStateChangeEvent.EVENT_NAME, PositionStateChangeEvent.createClosed(position));
         }
      }
   }
}
