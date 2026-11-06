import {render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import ProfileView from '../../src/pages/about/ProfileView';
import {ABOUT_NAV_LINKS,resolveAboutNavigation} from '../../src/data/aboutNavigation';
vi.mock('../../src/lib/supabase',()=>({isSupabaseConfigured:false,supabase:{}}));
const data=JSON.parse(readFileSync(resolve('test/fixtures/about-profile.json'),'utf8'));
it('preserves every paragraph and character without interpreting header or footnote lines',()=>{
  const original=JSON.stringify(data);
  render(<MemoryRouter initialEntries={['/about/profile']}><ProfileView data={data}/></MemoryRouter>);
  const article=screen.getByRole('article',{name:'Brief Profile text'});
  expect([...article.querySelectorAll('p')].map(p=>p.textContent)).toEqual(data.content.split(/\r?\n(?:[ \t]*\r?\n)+/).filter((p:string)=>p.length>0));
  expect(article.querySelector('h2,h3,a')).toBeNull();
  expect(article).toHaveTextContent('[01]');
  expect(article).toHaveTextContent('REFERENCES:');
  expect(JSON.stringify(data)).toBe(original);
});
it('shares all ten About labels and routes with the navbar fallback and marks only the current page',()=>{
  render(<MemoryRouter initialEntries={['/about/profile']}><ProfileView data={data}/></MemoryRouter>);
  const sidebar=screen.getByRole('complementary',{name:'About Talibon'});
  const links=within(sidebar).getAllByRole('link');
  expect(links.map(a=>({name:a.textContent,href:a.getAttribute('href')}))).toEqual(ABOUT_NAV_LINKS);
  expect(links.filter(a=>a.getAttribute('aria-current')==='page')).toHaveLength(1);
  expect(links[0]).toHaveAttribute('aria-current','page');
  expect(sidebar.querySelector('svg')).toBeNull();
  expect(screen.queryByRole('navigation',{name:'On this page'})).not.toBeInTheDocument();
});
it('honors CMS navigation order and falls back exactly as the navbar does',()=>{
  const rows=[{section:'TOURISM',name:'Tourism',href:'/tourism/spots'},{section:'ABOUT',name:'Brief History',href:'/about/history'},{section:'ABOUT',name:'Brief Profile',href:'/about/profile'}];
  expect(resolveAboutNavigation(rows)).toEqual(rows.slice(1));
  expect(resolveAboutNavigation([])).toBe(ABOUT_NAV_LINKS);
});
it('splits only blank lines, preserving ordinary newlines and spaces',()=>{
  render(<MemoryRouter><ProfileView data={{content:'  First line\nsecond line  \n\nLast paragraph'}}/></MemoryRouter>);
  expect([...screen.getByRole('article').querySelectorAll('p')].map(p=>p.textContent)).toEqual(['  First line\nsecond line  ','Last paragraph']);
});
