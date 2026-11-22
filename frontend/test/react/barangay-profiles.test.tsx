import {fireEvent,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it} from 'vitest';
import BarangaysView from '../../src/pages/about/BarangaysView';
import BarangayLogo from '../../src/components/BarangayLogo';

it.each(['Zamora','Burgos','Suba','San Pedro','San Jose','San Isidro','San Carlos',
  'San Agustin','Sag','Rizal','Poblacion','Nocnocan','Mahanay','Magsaysay',
  'Calituban','Busalian','Balintawak','Bagacay'])('shows the supplied seal for %s', name=>{
  render(<BarangaysView data={[{id:name,name}]}/>);
  expect(screen.getByRole('img',{name:`Barangay ${name} official seal`})).toHaveAttribute('src',
    expect.stringContaining(`${name.toLowerCase().replace(/ /g,'-')}.png`));
});

it('uses a fallback for missing or failed seals and loads the next selection',()=>{
  const {rerender}=render(<BarangayLogo name="Cataban" fallback={<span>Photo placeholder</span>}/>);
  expect(screen.getByText('Photo placeholder')).toBeVisible();
  rerender(<BarangayLogo name="Zamora" fallback={<span>Photo placeholder</span>}/>);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('Photo placeholder')).toBeVisible();
  rerender(<BarangayLogo name="Poblacion" fallback={<span>Photo placeholder</span>}/>);
  expect(screen.getByRole('img',{name:'Barangay Poblacion official seal'})).toBeVisible();
});

it('paginates the supplied records and resets to page one after a search',async()=>{
  const user=userEvent.setup();
  const data=Array.from({length:25},(_,index)=>({id:String(index),name:`Barangay ${index+1}`}));
  render(<BarangaysView data={data}/>);
  expect(screen.getByRole('status')).toHaveTextContent('25 barangays');
  expect(screen.getAllByRole('article')).toHaveLength(6);
  expect(screen.getByRole('button',{name:'Previous'})).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Page 5'}));
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(screen.getByRole('button',{name:'Page 5'})).toHaveAttribute('aria-current','page');
  expect(screen.getByRole('button',{name:'Next'})).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Previous'}));
  expect(screen.getByRole('button',{name:'Page 4'})).toHaveAttribute('aria-current','page');
  await user.type(screen.getByRole('searchbox'),'BARANGAY 25');
  expect(screen.getByRole('status')).toHaveTextContent('1 barangay');
  expect(screen.getByRole('heading',{name:'Barangay 25'})).toBeVisible();
  expect(screen.queryByRole('navigation',{name:'Barangay results pages'})).not.toBeInTheDocument();
  expect(data).toHaveLength(25);
});

it('keeps real supplied metadata and supports captain aliases and an empty state',async()=>{
  const user=userEvent.setup();
  render(<BarangaysView data={[
    {id:'one',barangay_name:'Bagacay',captain_name:'Published captain',office_hours:'Published hours',population:100,contact_number:'Published number',office_address:'Published address'},
    {id:'two',name:'Balintawak',captain:null,office_hours:null}
  ]}/>);
  const cards=screen.getAllByRole('article');
  ['Published captain','Published hours','100','Published number','Published address'].forEach(text=>expect(within(cards[0]).getByText(text)).toBeVisible());
  expect(within(cards[1]).getAllByText('Not specified')).toHaveLength(2);
  expect(document.querySelector('svg')).toBeNull();
  await user.type(screen.getByRole('searchbox'),'PUBLISHED CAPTAIN');
  expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.clear(screen.getByRole('searchbox'));
  await user.type(screen.getByRole('searchbox'),'zzz');
  expect(screen.getByRole('status')).toHaveTextContent('0 barangays');
  expect(screen.getByText('No barangays match your search')).toBeVisible();
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
});
