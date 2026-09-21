import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator';

export class ChatHistoryMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'What are the requirements for a Barangay Clearance?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class ChatRequestDto {
  @ApiProperty({
    description: 'Citizen message or query for the municipal assistant (1-2000 characters)',
    example: 'How do I apply for a business permit in Talibon?',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Optional conversation session UUID to maintain contextual dialogue',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    type: [ChatHistoryMessageDto],
    description: 'Optional bounded conversation history (maximum 10 turns to avoid token overflow)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Municipal assistant reply message',
    example: 'To apply for a Business Permit in Talibon, proceed to the Business Permits and Licensing Office (BPLO) at the Municipal Hall...',
  })
  reply: string;

  @ApiProperty({
    description: 'Conversation session UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  conversationId: string;

  @ApiProperty({
    type: [String],
    description: 'Relevant municipal departments, offices, or service references',
    example: ['Business Permits & Licensing Office (BPLO)', 'Municipal Treasury'],
  })
  sources: string[];

  @ApiProperty({
    example: '2026-09-21T15:30:00.000Z',
    description: 'Response timestamp (UTC ISO format)',
  })
  timestamp: string;
}
