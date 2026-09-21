import { Module } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { SupabaseService } from '../../supabase.service';
import { NotificationsController } from './notifications.controller';
@Module({ controllers: [NotificationsController], providers: [SupabaseService, EmailNotificationService], exports: [EmailNotificationService] })
export class NotificationsModule {}
