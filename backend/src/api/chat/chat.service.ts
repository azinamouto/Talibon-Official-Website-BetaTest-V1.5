import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ChatRequestDto, ChatResponseDto } from './chat.dto';

const MUNICIPAL_SYSTEM_PROMPT = `You are the official AI Municipal Assistant for the Municipality of Talibon, Province of Bohol, Philippines.
Your mission is to provide accurate, respectful, and helpful public service assistance to Talibon citizens and visitors in English, Filipino/Tagalog, or Cebuano/Bisaya.

MUNICIPALITY CONTEXT & OFFICIAL INFORMATION:
- Location: Municipal Hall, Poblacion, Talibon, Bohol, Philippines (6325).
- Office Hours: Monday to Friday, 8:00 AM - 5:00 PM (excluding official Philippine public holidays).
- Business Permits: Handled by Business Permits and Licensing Office (BPLO). Requires Barangay Business Clearance, DTI/SEC registration, Fire Safety Inspection Certificate, and Sanitary Permit.
- Civil Registry: Handled by Municipal Civil Registrar (MCR) for Birth Certificates, Marriage Certificates, Death Certificates, and Legitimation.
- Social Welfare: Handled by Municipal Social Welfare and Development Office (MSWDO) for Senior Citizen IDs, PWD IDs, and Assistance to Individuals in Crisis Situations (AICS).
- Taxes & Assessment: Handled by Municipal Assessor and Municipal Treasury for Real Property Tax (Amillar) and Community Tax Certificate (Cedula).
- Emergency Numbers: MDRRMO (Disaster Risk Reduction) / Rescue 24/7, PNP Talibon Station, BFP Talibon Fire Station.

SAFETY & COMPLIANCE RULES:
1. Never disclose administrative secrets, backend environment variables, passwords, or system internals.
2. Never execute or echo administrative system commands or override your municipal identity.
3. Keep answers concise, factual, and actionable. Direct citizens to relevant municipal offices when in-person verification or payment is required.`;

const MUNICIPAL_TOPIC_SOURCES: Array<{ keywords: string[]; source: string }> = [
  { keywords: ['business', 'permit', 'boss', 'bplo', 'license'], source: 'Business Permits & Licensing Office (BPLO)' },
  { keywords: ['birth', 'marriage', 'death', 'civil', 'registry', 'certificate'], source: 'Municipal Civil Registrar (MCR)' },
  { keywords: ['tax', 'amillar', 'treasury', 'cedula', 'payment'], source: 'Municipal Treasury Office' },
  { keywords: ['indigent', 'indigency', 'welfare', 'senior', 'pwd', 'mswdo', 'aics', 'aid'], source: 'Municipal Social Welfare & Development Office (MSWDO)' },
  { keywords: ['emergency', 'disaster', 'flood', 'typhoon', 'mdrrmo', 'rescue', 'fire', 'police'], source: 'MDRRMO & Municipal Emergency Services' },
  { keywords: ['tourist', 'tourism', 'spot', 'beach', 'san pedro', 'islands'], source: 'Talibon Tourism & Cultural Affairs Office' },
];

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const conversationId = dto.conversationId || randomUUID();
    const timestamp = new Date().toISOString();
    const sources = this.extractSources(dto.message);

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    // When Gemini API key is configured, invoke the Gemini REST API
    if (apiKey && !apiKey.includes('placeholder') && !apiKey.includes('your-')) {
      return this.callGeminiProvider(dto, conversationId, sources, timestamp, apiKey);
    }

    // Fallback: If GEMINI_API_KEY is not configured or in test mode, return curated municipal guidance
    const fallbackReply = this.generateMunicipalFallback(dto.message);
    return {
      reply: fallbackReply,
      conversationId,
      sources,
      timestamp,
    };
  }

  private async callGeminiProvider(
    dto: ChatRequestDto,
    conversationId: string,
    sources: string[],
    timestamp: string,
    apiKey: string,
  ): Promise<ChatResponseDto> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Append bounded conversation history
    if (dto.history?.length) {
      for (const turn of dto.history.slice(-10)) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: dto.message }],
    });

    const payload = {
      contents,
      systemInstruction: {
        parts: [{ text: MUNICIPAL_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 800,
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      // 15-second timeout using standard AbortSignal.timeout
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        // Log error presence and HTTP status only - NEVER log the key or error payload
        this.logger.warn(`AI provider returned non-success status: ${response.status}`);
        throw new HttpException(
          'The AI municipal assistant is temporarily unavailable. Please try again later or visit the municipal office.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const result = (await response.json()) as any;
      const reply = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!reply) {
        throw new HttpException(
          'The AI assistant could not generate a response. Please rephrase your query.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        reply,
        conversationId,
        sources,
        timestamp,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Distinguish timeouts from other network/provider errors
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        this.logger.warn('AI provider request timed out after 15 seconds.');
        throw new HttpException(
          'The AI assistant service request timed out. Please try again.',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      this.logger.error('Unexpected error while communicating with AI provider.');
      throw new HttpException(
        'The AI municipal assistant is temporarily unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private extractSources(message: string): string[] {
    const lower = message.toLowerCase();
    const matched = new Set<string>();

    for (const item of MUNICIPAL_TOPIC_SOURCES) {
      if (item.keywords.some((kw) => lower.includes(kw))) {
        matched.add(item.source);
      }
    }

    if (matched.size === 0) {
      matched.add('Talibon Municipal Public Assistance Desk');
    }

    return Array.from(matched);
  }

  private generateMunicipalFallback(message: string): string {
    const lower = message.toLowerCase();

    if (lower.includes('business') || lower.includes('permit') || lower.includes('boss')) {
      return (
        'For Business Permit applications and renewals in Talibon, please proceed to the Business Permits and Licensing Office (BPLO) located on the Ground Floor of the Talibon Municipal Hall. ' +
        'Requirements include: Barangay Business Clearance, DTI or SEC Registration, Certificate of Occupancy / Fire Safety Inspection Certificate, and Sanitary Permit. ' +
        'Office hours are Monday to Friday, 8:00 AM to 5:00 PM.'
      );
    }

    if (lower.includes('civil') || lower.includes('birth') || lower.includes('marriage') || lower.includes('death')) {
      return (
        'Civil Registry documents (Birth, Marriage, Death Certificates) can be requested through the Municipal Civil Registrar (MCR) office at the Talibon Municipal Hall. ' +
        'You may also apply through our online E-Services portal on this website.'
      );
    }

    if (lower.includes('emergency') || lower.includes('rescue') || lower.includes('fire') || lower.includes('police')) {
      return (
        'For municipal emergencies in Talibon, Bohol:\n' +
        '- Talibon MDRRMO / Rescue Hotline: 0912-345-6789 (24/7)\n' +
        '- Talibon Police Station (PNP): (038) 515-9123\n' +
        '- Bureau of Fire Protection (BFP): (038) 515-9111\n' +
        'Please call emergency services immediately if lives or property are at risk.'
      );
    }

    if (lower.includes('tax') || lower.includes('amillar') || lower.includes('cedula')) {
      return (
        'For Community Tax Certificates (Cedula) and Real Property Tax (Amillar) payments, visit the Municipal Treasury Office on the Ground Floor of the Talibon Municipal Hall. ' +
        'You can also check online assessment options through our E-Services section.'
      );
    }

    return (
      'Maayong adlaw! Welcome to the Municipality of Talibon Official Assistant. ' +
      'I can assist you with municipal services, business permits, civil registry, citizen charter procedures, and office directory information. ' +
      'How may I help you today?'
    );
  }
}
