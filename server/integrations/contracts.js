/** Shared integration result shapes. Amounts are integer cents; currency is explicit.
 * @typedef {{id:string,title:string,description:string,kind:string,priceCents:null,url:string,coordinates:{lat:number,lng:number},distanceKm:number,reasons:string[],alreadySaved:boolean}} Recommendation
 * @typedef {{date:string,startTime:string,endTime:string,userId:string}} AvailabilityWindow
 * @typedef {{title:string,date:string,time:string,location:string}} CalendarEvent
 */
export class IntegrationNotConfiguredError extends Error {
  constructor(name) {
    super(`${name} is not connected yet.`);
    this.name = "IntegrationNotConfiguredError";
    this.code = "NOT_CONFIGURED";
  }
}
