import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import StaffLogin from '../../src/pages/StaffLogin';
import { staffRequest } from '../../src/contexts/StaffAuthContext';

vi.mock('../../src/contexts/StaffAuthContext',()=>({staffRequest:vi.fn(),useStaffAuth:()=>({refresh:vi.fn()})}));
vi.mock('../../src/contexts/AppConfigContext',()=>({useAppConfig:()=>({appName:'TAL.GOV'})}));
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.resetAllMocks();history.replaceState(null,'','/');});
it('disables password recovery and discards old reset links while retaining sign in',()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','false');
  history.replaceState(null,'','/staff/login#token=synthetic-expired-token');
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  const recovery=screen.getByRole('button',{name:/Forgot (?:your )?password\?/});
  expect(recovery).toBeDisabled();
  expect(recovery).toHaveAttribute('tabindex','-1');
  expect(recovery).toHaveAccessibleName('Forgot your password?');
  expect(recovery).toHaveAccessibleDescription('Ask your system administrator to reset it.');
  fireEvent.click(recovery);
  expect(screen.queryByRole('button',{name:'Request recovery'})).not.toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toBeVisible();
  expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  expect(location.hash).toBe('');
  expect(staffRequest).not.toHaveBeenCalled();
});
it('retains TOTP and backup-code MFA when password recovery is disabled',async()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','false');
  vi.mocked(staffRequest).mockResolvedValue({success:true,mfaRequired:true});
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Staff email'),{target:{value:'synthetic@example.invalid'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
  await screen.findByLabelText('Authenticator code');
  fireEvent.click(screen.getByRole('button',{name:'Use recovery code'}));
  expect(screen.getByLabelText('Recovery code')).toBeVisible();
  expect(screen.getByRole('button',{name:/Forgot (?:your )?password\?/})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Recovery code'),{target:{value:'synthetic-backup-code'}});
  fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  await vi.waitFor(()=>expect(staffRequest).toHaveBeenLastCalledWith('/api/staff-auth/two-factor/verify-backup-code',{code:'synthetic-backup-code'}));
});
it.each([undefined,'False',''])('fails closed for missing or unrecognized recovery flag %s',value=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED',value);
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  expect(screen.getByRole('button',{name:/Forgot (?:your )?password\?/})).toBeDisabled();
});
it('skips unavailable recovery during keyboard navigation',async()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','false');
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  const user=userEvent.setup();
  screen.getByRole('button',{name:'Sign in'}).focus();
  await user.tab();
  expect(screen.getByRole('link',{name:'Privacy policy'})).toHaveFocus();
  await user.tab();
  expect(document.body).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('link',{name:'Back to public website'})).toHaveFocus();
});
it('keeps the existing recovery view available when enabled',()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','true');
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:'Forgot password?'}));
  expect(screen.getByRole('button',{name:'Request recovery'})).toBeVisible();
});
it('retains authenticator enrollment and TOTP submission with recovery off',async()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','false');
  vi.mocked(staffRequest).mockResolvedValueOnce({success:true,mfaRequired:false})
    .mockResolvedValueOnce({totpURI:'otpauth://totp/Synthetic?secret=SYNTHETIC',backupCodes:['synthetic-one-use']})
    .mockResolvedValueOnce({success:true});
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Staff email'),{target:{value:'synthetic@example.invalid'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
  await screen.findByRole('button',{name:'Set up MFA'});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'synthetic-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Set up MFA'}));
  await screen.findByText('synthetic-one-use');
  expect(screen.queryByRole('button',{name:'Use recovery code'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Authenticator code'),{target:{value:'123456'}});
  fireEvent.click(screen.getByRole('button',{name:'Continue'}));
  await vi.waitFor(()=>expect(staffRequest).toHaveBeenLastCalledWith('/api/staff-auth/two-factor/verify-totp',{code:'123456'}));
});
it('keeps enabled reset links and password visibility accessible',()=>{
  vi.stubEnv('VITE_STAFF_PASSWORD_RECOVERY_ENABLED','true');
  history.replaceState(null,'','/staff/login#token=synthetic-reset-token');
  render(<MemoryRouter><StaffLogin/></MemoryRouter>);
  expect(screen.getByLabelText('New password')).toHaveAttribute('type','password');
  fireEvent.click(screen.getByRole('button',{name:'Show password'}));
  expect(screen.getByLabelText('New password')).toHaveAttribute('type','text');
  expect(screen.getByRole('button',{name:'Hide password'})).toHaveAttribute('aria-pressed','true');
  expect(location.hash).toBe('');
});
