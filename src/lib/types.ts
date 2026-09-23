export type Destination = { id:string; slug:string; label:string; description:string|null; url:string; icon:string; sort_order:number; active:boolean };
export type Campaign = { id:string; name:string; slug:string; status:"draft"|"active"|"archived"; starts_on:string|null; ends_on:string|null; created_at:string };
export type TrackingLink = {
  id:string; code:string; label:string; channel_group:string; source:string; medium:string;
  asset:string|null; placement:string|null; asset_id:string|null; placement_id:string|null; distribution_unit:string|null;
  landing_path:string; active:boolean; active_from:string|null; active_to:string|null; campaign_id:string|null;
  referral_participant_id:string|null;
  campaign?:Pick<Campaign,"id"|"name"|"slug"|"status">|null;
  asset_entity?:{id:string;label:string;slug:string}|null; placement_entity?:{id:string;label:string;slug:string}|null;
  referral_participant?:{id:string;display_name:string}|null;
};
export type AnalyticsDashboard = {
  pageViews:number; trackingEntries:number; sessions:number; visitors:number; newVisitors:number; returningVisitors:number; returningVisitorRate:number; outboundSessions:number; outboundSessionRate:number;
  outboundClicks:number; clicksPerOutboundSession:number; multiDestinationSessions:number; multiDestinationSessionRate:number;
  returnToHubSessions:number; returnToHubRate:number; contactInterestSessions:number; contactInterestRate:number; contactClickRate:number;
  topSources:Array<{label:string;value:number}>; topCampaigns:Array<{label:string;value:number}>; topAssets:Array<{label:string;value:number}>; topPlacements:Array<{label:string;value:number}>; topDestinations:Array<{label:string;value:number}>; topTrackingLinks:Array<{label:string;value:number}>;
  timeSeries:Array<{date:string;sessions:number;outboundSessions:number}>; trafficBreakdown:Array<{label:string;value:number}>;
};
