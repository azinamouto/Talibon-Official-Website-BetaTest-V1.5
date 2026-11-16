import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import BudgetView from '../../src/pages/transparency/BudgetView';
import FinanceView from '../../src/pages/transparency/FinanceView';
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
