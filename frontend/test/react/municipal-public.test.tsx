import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import BudgetView from '../../src/pages/transparency/BudgetView';
import FinanceView from '../../src/pages/transparency/FinanceView';
import ReportingChart, { validReportingChart } from '../../src/components/ReportingChart';
import FestivitiesView from '../../src/pages/tourism/FestivitiesView';
vi.mock('motion/react',()=>({motion:{div:({children,className}:{children:ReactNode;className?:string})=><div className={className}>{children}</div>}}));
afterEach(cleanup);
const attachment={id:'verified-pdf',kind:'document' as const,title:'Official PDF',caption:'Verified budget attachment',alt_text:'',download_url:'/api/media/verified-pdf/download',preview_url:'/api/media/verified-pdf/preview'};
it('published budget attachments replace the pending status without inventing fiscal figures',()=>{
 render(<MemoryRouter><BudgetView data={{documents:[{id:'report',title:'Approved budget report',file_url:attachment.download_url,attachments:[attachment]}]}} /></MemoryRouter>);
 expect(screen.queryByText('TO BE POSTED')).not.toBeInTheDocument();
 expect(screen.getByText('DOCUMENTS PUBLISHED')).toBeVisible();
 expect(screen.getByRole('link',{name:'Verified budget attachment · Download PDF'})).toHaveAttribute('href',attachment.download_url);
 expect(screen.getByText(/1 approved budget publication/)).toBeVisible();
});
it('finance reports expose every verified PDF and preserve the original legacy link',()=>{
 render(<FinanceView data={[{id:'cms-report',title:'Published finance report',url:attachment.download_url,attachments:[attachment,{...attachment,id:'second-pdf',caption:'Supporting statement',download_url:'/api/media/second-pdf/download'}]},{id:'legacy-report',title:'Original official report',url:'https://official.example.invalid/report.pdf'}]} />);
 expect(screen.getByRole('link',{name:'Supporting statement · Download PDF'})).toHaveAttribute('href','/api/media/second-pdf/download');
 expect(screen.getByRole('link',{name:'View report'})).toHaveAttribute('href','https://official.example.invalid/report.pdf');
});
it('renders fictional reporting relationships and uses authorized portrait URLs',()=>{
 const nodes=[{id:'leader',name:'Fictional leader',role:'Test position',office:'Fixture office',reportsTo:null,photoAssetId:'portrait',image_url:'/api/media/portrait/preview'},{id:'report',name:'Fictional colleague',role:'Test deputy',reportsTo:'leader'}];
 const {rerender}=render(<ReportingChart nodes={nodes}/>);
 expect(screen.getByRole('list',{name:'Organizational reporting relationships'})).toBeVisible();
 expect(screen.getByRole('heading',{name:'Fictional colleague'}).closest('li')?.parentElement?.closest('li')).toHaveTextContent('Fictional leader');
 expect(screen.getByRole('img',{name:'Fictional leader portrait'})).toHaveAttribute('src','/api/media/portrait/preview');
 rerender(<ReportingChart nodes={nodes} privatePreview/>);
 expect(screen.getByRole('img',{name:'Fictional leader portrait'})).toHaveAttribute('src','/api/admin/media/portrait/preview');
});
it('fails closed for missing parents, duplicate identities and hierarchy cycles',()=>{
 const root={id:'one',name:'Fictional official',role:'Test role',reportsTo:null};
 expect(validReportingChart([root,{...root,id:'two',reportsTo:'missing'}])).toBe(false);
 expect(validReportingChart([root,root])).toBe(false);
 const cycle=[{...root,reportsTo:'two'},{...root,id:'two',reportsTo:'one'}];
 expect(validReportingChart(cycle)).toBe(false);
 render(<ReportingChart nodes={cycle}/>);
 expect(screen.getByRole('alert')).toHaveTextContent('reporting relationships are unavailable');
});
it('shows fictional event date, times, venue and verified attachments without a fabricated poster',()=>{
 render(<FestivitiesView data={[{name:'Fictional test event',date:'2026-11-17',description:'Automated fixture only',time:'09:00 - 10:00',venue:'Fictional venue',attachments:[attachment]}]}/>);
 expect(screen.getByRole('heading',{name:'Fictional test event'})).toBeVisible();
 expect(screen.getByText('2026-11-17')).toBeVisible();
 expect(screen.getByText('09:00 - 10:00')).toBeVisible();
 expect(screen.getByText('Fictional venue')).toBeVisible();
 expect(screen.getByRole('link',{name:/Verified budget attachment/})).toHaveAttribute('href',attachment.download_url);
 expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
