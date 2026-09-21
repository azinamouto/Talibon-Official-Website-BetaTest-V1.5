import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDefined, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export const FORM_TYPES = ['Barangay Clearance', 'Certificate of Indigency', 'Business Permit', 'Building Permit', 'Zoning Clearance'] as const;
export type FormType = typeof FORM_TYPES[number];
const Trim = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);

export class BarangayDetailsDto {
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(200) sitioPurok!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(150) yearsOfResidency!: number;
}
export class IndigencyDetailsDto {
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(300) address!: string;
  @ApiProperty() @IsNumber() @Min(0) @Max(1e9) monthlyIncome!: number;
  @ApiProperty() @IsInt() @Min(1) @Max(100) familyMembers!: number;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(1000) reason!: string;
}
export class BusinessDetailsDto {
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(200) businessName!: string;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(300) businessAddress!: string;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(200) natureOfBusiness!: string;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(100) dtiSecRegNo!: string;
}
export class ZoningDetailsDto {
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(300) propertyAddress!: string;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(100) lotNumber!: string;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(100) taxDeclarationNo!: string;
}
export class BuildingDetailsDto extends ZoningDetailsDto {
  @ApiProperty({ enum: ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Other'] })
  @IsIn(['Residential', 'Commercial', 'Industrial', 'Institutional', 'Other']) constructionType!: string;
  @ApiProperty() @IsNumber() @Min(0.01) @Max(1e12) estimatedCost!: number;
  @ApiProperty() @IsNumber() @Min(0.01) @Max(1e8) floorArea!: number;
  @ApiProperty() @Trim() @IsString() @IsNotEmpty() @MaxLength(200) engineerArchitect!: string;
}
export const DETAIL_DTOS = {
  'Barangay Clearance': BarangayDetailsDto, 'Certificate of Indigency': IndigencyDetailsDto,
  'Business Permit': BusinessDetailsDto, 'Building Permit': BuildingDetailsDto, 'Zoning Clearance': ZoningDetailsDto,
};
export class CreateCertificateRequestDto {
  @ApiProperty({ enum: FORM_TYPES }) @IsIn(FORM_TYPES) documentType!: FormType;
  @ApiProperty({ example: 'poblacion' }) @Trim() @IsString() @IsNotEmpty() @MaxLength(100) barangay!: string;
  @ApiProperty({ example: 'Juan Dela Cruz' }) @Trim() @IsString() @IsNotEmpty() @MaxLength(100) fullName!: string;
  @ApiProperty({ example: 'juan@example.test' }) @Trim() @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ example: '09171234567' }) @IsString() @Matches(/^(?:\+63|0)9\d{9}$/) mobileNumber!: string;
  @ApiProperty({ example: 'Employment' }) @Trim() @IsString() @IsNotEmpty() @MaxLength(1000) purpose!: string;
  @ApiPropertyOptional({ type: [String], description: 'Uploaded document references, not file contents.' })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(500, { each: true }) attachments?: string[];
  @ApiProperty({ type: Object, description: 'Required typed fields selected by documentType. See SPRINT3_API.md.' })
  @IsDefined() @IsObject() @ValidateNested()
  @Type(options => DETAIL_DTOS[options?.object?.documentType as FormType] ?? Object)
  details!: BarangayDetailsDto | IndigencyDetailsDto | BusinessDetailsDto | BuildingDetailsDto | ZoningDetailsDto;
}
