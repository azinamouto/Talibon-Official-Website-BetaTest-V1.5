require('reflect-metadata');
const { EmailNotificationService, renderFormEmail } = require('../dist/api/notifications/email-notification.service');
const { ResendEmailProvider } = require('../dist/api/notifications/providers/resend-email.provider');
const axios = require('axios').default;
const job = { id: 'job-1', lease_token: 'lease-1', attempts: 2, payload: { email:'citizen@example.test',fullName:'<script>Citizen</script>',ticketId:'TAL-1',documentType:'Business Permit',status:'Approved',remarks:'<img src=x>',subject:'Update {{ticketId}}',body:'Hello {{fullName}} {{status}} {{remarks}} {{trackingUrl}}' } };
afterEach(() => { jest.restoreAllMocks(); delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM_ADDRESS; delete process.env.APP_URL; });
function setup() {
  process.env.APP_URL='https://example.test';
  jest.spyOn(ResendEmailProvider.prototype,'isConfigured').mockReturnValue(true);
  const send=jest.spyOn(ResendEmailProvider.prototype,'sendEmail');
  const rpc=jest.fn().mockResolvedValueOnce({ data:[job],error:null }).mockResolvedValueOnce({ data:true,error:null }).mockResolvedValue({ data:[],error:null });
  return { send,rpc,service:new EmailNotificationService({ getClient:()=>({rpc}) }) };
}
test('configurable text templates escape HTML and use a stable per-event idempotency key', () => {
  const rendered=renderFormEmail(job,'https://example.test/');
  expect(rendered.html).not.toContain('<script>'); expect(rendered.html).not.toContain('<img');
  expect(rendered.text).toContain('Approved'); expect(rendered.subject).toBe('Update TAL-1');
  expect(rendered.idempotencyKey).toBe('form-email-job-1');
});
test.each([false,true])('worker persists delivery outcome (success=%s) before moving on', async success => {
  const {send,rpc,service}=setup(); send.mockResolvedValue({success,messageId:success?'provider-id':undefined,error:success?undefined:'provider_http_503'});
  expect(await service.processPending()).toEqual({processed:1,sent:success?1:0,failed:success?0:1});
  expect(rpc).toHaveBeenNthCalledWith(2,'finish_form_email',expect.objectContaining({p_id:job.id,p_token:job.lease_token,p_success:success}));
});
test('provider exceptions are persisted without leaking the raw exception', async () => {
  const {send,rpc,service}=setup(); send.mockRejectedValue(new Error('secret provider payload'));
  await service.processPending(); expect(rpc.mock.calls[1][1].p_error).toBe('provider_exception');
});
test('failed acknowledgement stops processing and leaves lease recovery to the database', async () => {
  const {send,rpc,service}=setup(); send.mockResolvedValue({success:true}); rpc.mockReset().mockResolvedValueOnce({data:[job]}).mockResolvedValueOnce({error:{message:'private'}});
  await expect(service.processPending()).rejects.toMatchObject({status:503}); expect(send).toHaveBeenCalledTimes(1);
});
test('missing delivery configuration claims no jobs and cannot count console output as sent', async () => {
  const {rpc,service}=setup(); delete process.env.APP_URL;
  await expect(service.processPending()).rejects.toMatchObject({status:503}); expect(rpc).not.toHaveBeenCalled();
});
test('Resend uses a timeout and stable header, and sanitizes errors', async () => {
  process.env.RESEND_API_KEY='test-placeholder'; process.env.EMAIL_FROM_ADDRESS='mail@example.test';
  const post=jest.spyOn(axios,'post').mockResolvedValue({data:{id:'message-id'}});
  const provider=new ResendEmailProvider(), options=renderFormEmail(job,'https://example.test');
  expect((await provider.sendEmail(options)).success).toBe(true);
  expect(post.mock.calls[0][2]).toMatchObject({timeout:10000,headers:{'Idempotency-Key':'form-email-job-1'}});
  post.mockRejectedValue(new Error('secret credentials')); expect(await provider.sendEmail(options)).toEqual({success:false,error:'provider_network_error'});
});
