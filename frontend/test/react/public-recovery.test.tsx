import {cleanup, render, screen, fireEvent} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import OrganizationalChartPage from '../../src/pages/OrganizationalChartPage';
import {executiveApi} from '../../src/services/api';
import {aboutApi} from '../../src/services/aboutApi';
import {validReportingChart} from '../../src/components/ReportingChart';
vi.mock('../../src/services/api',()=>({executiveApi:{getChart:vi.fn()}}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('shows an unpublished chart as empty and supports retry from invalid responses',async()=>{
 vi.mocked(executiveApi.getChart).mockResolvedValueOnce({} as never);
 const view=render(<OrganizationalChartPage/>);
 expect(await screen.findByText('Structure Not Found')).toBeVisible();
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 view.unmount();
 vi.mocked(executiveApi.getChart).mockResolvedValueOnce({nodes:[{id:'root',name:'Fixture',role:'Test',office:{invalid:true}}]} as never).mockResolvedValueOnce({} as never);
 render(<OrganizationalChartPage/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('response is invalid');
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));
 expect(await screen.findByText('Structure Not Found')).toBeVisible();
});
it('rejects invalid optional reporting fields and malformed attachments',async()=>{
 expect(validReportingChart([{id:'r',name:'Fixture',role:'Test',reportsTo:0}])).toBe(false);
 vi.mocked(executiveApi.getChart).mockResolvedValueOnce({nodes:[{id:'r',name:'Fixture',role:'Test'}],attachments:'bad'} as never);
 render(<OrganizationalChartPage/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('response is invalid');
});
it('rejects malformed About data before it reaches rendering and preserves HTTP failures',async()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 for(const value of [{content:{}},{images:[{}]},{title:'Missing body'},null,[]]){
 fetch.mockResolvedValueOnce({ok:true,json:async()=>value});
 await expect(aboutApi.getDemographics()).rejects.toThrow('Invalid About');
 }
 for(const timeline of [{}, [null], [{year:'2024',title:{},description:'Fixture'}]]){
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({content:'Fixture',timeline})});
 await expect(aboutApi.getHistory()).rejects.toThrow('Invalid About');
 }
 fetch.mockResolvedValueOnce({ok:false,status:401});
 await expect(aboutApi.getLocation()).rejects.toThrow('(401)');
 fetch.mockResolvedValueOnce({ok:true,json:async()=>({lat:0,lng:0,description:'Fixture'})});
 await expect(aboutApi.getLocation()).resolves.toMatchObject({lat:0,lng:0});
});
