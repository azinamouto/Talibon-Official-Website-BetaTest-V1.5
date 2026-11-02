import { Controller, Get } from '@nestjs/common';
import { Public } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';

@Public()
@RateLimit(RateLimitCategory.PUBLIC_READ)
@Controller(['api/forms', 'api/public-forms'])
export class PublicFormsController {
  @Get('business-permits')
  getBusinessPermits() { return [{ id: 1, title: 'Business Permit Application Form', url: '#' }, { id: 2, title: 'Business Permit Renewal Form', url: '#' }]; }
  @Get('building-permits')
  getBuildingPermits() { return [{ id: 1, title: 'Building Permit Application Form', url: '#' }, { id: 2, title: 'Electrical Permit Form', url: '#' }, { id: 3, title: 'Plumbing Permit Form', url: '#' }]; }
  @Get('zoning-clearance')
  getZoningClearance() { return [{ id: 1, title: 'Zoning Clearance Application Form', url: '#' }]; }
  @Get('downloadable')
  getDownloadable() { return [...this.getBusinessPermits(), ...this.getBuildingPermits(), ...this.getZoningClearance()]; }
}
