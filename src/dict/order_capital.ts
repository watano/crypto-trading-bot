export class OrderCapital {
   static ASSET = 'asset';
   static CURRENCY = 'currency';
   static BALANCE = 'balance';

   type: string = OrderCapital.ASSET;
   asset?: any;
   currency?: any;
   balance?: any;

   static createAsset(asset: any): OrderCapital {
      const capital = new OrderCapital();
      capital.type = OrderCapital.ASSET;
      capital.asset = asset;
      return capital;
   }

   static createCurrency(currency: any): OrderCapital {
      const capital = new OrderCapital();
      capital.type = OrderCapital.CURRENCY;
      capital.currency = currency;
      return capital;
   }

   static createBalance(balance: any): OrderCapital {
      const capital = new OrderCapital();
      capital.type = OrderCapital.BALANCE;
      capital.balance = balance;
      return capital;
   }

   getAmount(): any {
      if (this.type === OrderCapital.CURRENCY) {
         return this.getCurrency();
      }

      if (this.type === OrderCapital.ASSET) {
         return this.getAsset();
      }

      if (this.type === OrderCapital.BALANCE) {
         return this.getBalance();
      }

      throw new Error(`Invalid capital type: ${this.type}`);
   }

   getAsset(): any {
      return this.asset;
   }

   getCurrency(): any {
      return this.currency;
   }

   getBalance(): any {
      return this.balance;
   }
}
