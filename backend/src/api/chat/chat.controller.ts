import { Body, Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiGatewayTimeoutResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { ChatRequestDto, ChatResponseDto } from './chat.dto';
import { ChatService } from './chat.service';

@ApiTags('AI Chat')
@ApiBearerAuth()
@RateLimit(RateLimitCategory.AI_CHAT)
@Controller('api/chat')
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Interact with the municipal AI assistant (authenticated with rate limiting)',
    description: 'Requires a valid Bearer token. Rate limited to 10 queries per minute per client.',
  })
  @ApiCreatedResponse({
    type: ChatResponseDto,
    description: 'AI assistant response with grounded municipal references and conversation session ID',
  })
  @ApiBadRequestResponse({ description: 'Message exceeds 2000 characters, empty message, or invalid payload schema' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired session token' })
  @ApiTooManyRequestsResponse({ description: 'AI query rate limit exceeded (10 requests/min). Retry after delay.' })
  @ApiGatewayTimeoutResponse({ description: 'Upstream AI provider timed out after 15 seconds' })
  @ApiServiceUnavailableResponse({ description: 'AI municipal assistant provider is temporarily unavailable' })
  chat(@Body() body: ChatRequestDto) {
    return this.chatService.chat(body);
  }
}

