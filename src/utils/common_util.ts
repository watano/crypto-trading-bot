/**
 *
 * @param {string} side
 * @param {number} currentPrice
 * @param {number} entryPrice
 * @returns {number}
 */
export const getProfitAsPercent = (side: string, currentPrice: number, entryPrice: number): number => {
   switch (side) {
      case 'long':
         return Number.parseFloat(((currentPrice / entryPrice - 1) * 100).toFixed(2));
      case 'short':
         return Number.parseFloat(((entryPrice / currentPrice - 1) * 100).toFixed(2));
      default:
         throw new Error(`Invalid direction given for profit ${side}`);
   }
};

export const camelToSnakeCase = (text: string): string => {
   return text
      .replace(/(.)([A-Z][a-z]+)/, '$1_$2')
      .replace(/([a-z0-9])([A-Z])/, '$1_$2')
      .toLowerCase();
};
