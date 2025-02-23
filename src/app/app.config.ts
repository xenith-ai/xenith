import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { routes } from './app.routes';
import { ConversationService } from './services/conversation/conversation.service';
import { AIService } from './services/ai/ai.service';
import { UserService } from './services/user/user.service';
import { InstanceOfPipe } from './pipes/instance-of.pipe';
import { WhisperService } from './services/whisper/whisper.service';
import { AudioService } from './services/audio/audio.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule),
    ConversationService,
    AIService,
    UserService,
    InstanceOfPipe,
    WhisperService,
    AudioService
  ],
};
