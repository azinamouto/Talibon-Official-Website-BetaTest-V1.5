export type MunicipalGroup = 'news' | 'tourism' | 'transparency' | 'government' | 'galleries' | 'downloadables';
type Field = { key: string; label: string; multiline?: boolean; options?: string[]; type?: string; max?: number; required?: boolean };
export type MunicipalModule = { kind: string; label: string; group: MunicipalGroup; fields: Field[]; slug?: string };
const description: Field={key:'description',label:'Description',multiline:true,max:10000,required:true};
const article: Field[]=[{key:'summary',label:'Summary',multiline:true,max:2000,required:true},{key:'content',label:'Article text',multiline:true,max:100000,required:true},{key:'author',label:'Issuing office or author'},{key:'date',label:'Release date',type:'date'}];
export const municipalModules: MunicipalModule[]=[
  {kind:'news',label:'News & announcements',group:'news',fields:[{key:'category',label:'Category',options:['ARTICLE','ANNOUNCEMENT','NOTICE','ADVISORY','UPDATE'],required:true},...article]},
  {kind:'advisories',label:'Municipal advisories',group:'news',fields:article},
  {kind:'updates',label:'Public updates',group:'news',fields:article},
  {kind:'tourism_spots',label:'Tourist spots',group:'tourism',fields:[description,{key:'location',label:'Location'},{key:'address',label:'Address'},{key:'contact',label:'Contact information'},{key:'opening_hours',label:'Verified visiting hours'}]},
  {kind:'tourism_festivals',label:'Festivals',group:'tourism',fields:[description,{key:'date',label:'Festival date',type:'date'},{key:'venue',label:'Venue'},{key:'time',label:'Time'}]},
  {kind:'tourism_delicacies',label:'Local delicacies',group:'tourism',fields:[description]},
  {kind:'galleries',label:'Tourism galleries',group:'tourism',fields:[description,{key:'category',label:'Collection category',options:['tourism'],required:true}]},
  {kind:'transparency_reports',label:'Official reports & notices',group:'transparency',fields:[{key:'category',label:'Publication category',options:['full-disclosure','infrastructure','finance','budget','bidding','executive-order'],required:true},description,{key:'year',label:'Reporting year',max:4},{key:'reference',label:'Official reference number'},{key:'date',label:'Issue date',type:'date'},{key:'deadline',label:'Bidding deadline',type:'date'},{key:'budget',label:'Project budget (as officially reported)'},{key:'status',label:'Project status'}]},
  {kind:'pages',label:'Executive mandate',group:'government',slug:'executive-mandate',fields:[{key:'content',label:'Official mandate',multiline:true,max:100000,required:true}]},
  {kind:'pages',label:'Legislative mandate',group:'government',slug:'legislative-mandate',fields:[{key:'content',label:'Official mandate',multiline:true,max:100000,required:true}]},
  {kind:'organizational_chart',label:'Organizational chart',group:'government',slug:'executive-chart',fields:[]},
  {kind:'departments',label:'Departments & offices',group:'government',fields:[description,{key:'head',label:'Office head'},{key:'contact',label:'Contact number'},{key:'address',label:'Office address'}]},
  {kind:'galleries',label:'Photo collections',group:'galleries',fields:[description,{key:'category',label:'Collection category',options:['municipal','tourism'],required:true}]},
  {kind:'downloadables',label:'Downloadable documents',group:'downloadables',fields:[description,{key:'category',label:'Document category',required:true},{key:'year',label:'Issue year',max:4},{key:'reference',label:'Official reference number'}]},
];
export type Attachment = { assetId: string; caption: string; altText: string };
export type ContentRow = { id: string; kind: string; title: string; slug: string; source_id: string; publication: 'draft'|'published'|'archived'; version: number; updated_at: string; body: Record<string,unknown> & { attachments?: Attachment[]; featuredAssetId?: string } };
export type ContentSource = { id: string; reference: string; owner: string; sha256: string; approved: boolean; reviewed_at: string | null };
