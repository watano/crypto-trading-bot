import _ from 'lodash';

export class LogsHttp {
   private logsRepository: any;

   constructor(logsRepository: any) {
      this.logsRepository = logsRepository;
   }

   async getLogsPageVariables(request: any, response: any): Promise<any> {
      let excludeLevels = request.query.exclude_levels || [];

      if (excludeLevels.length === 0 && !('filters' in request.cookies)) {
         excludeLevels = ['debug'];
      }

      response.cookie('filters', excludeLevels, {
         maxAge: 60 * 60 * 24 * 30 * 1000,
      });

      return {
         logs: await this.logsRepository.getLatestLogs(excludeLevels),
         levels: await this.logsRepository.getLevels(),
         form: {
            excludeLevels: excludeLevels,
         },
      };
   }
}
