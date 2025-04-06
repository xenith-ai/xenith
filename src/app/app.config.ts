import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { routes } from './app.routes';
import { ConversationService } from './services/conversation/conversation.service';
import { AssistantService } from './services/assistant/assistant.service';
import { UserService } from './services/user/user.service';
import { InstanceOfPipe } from './pipes/instance-of.pipe';
import { WhisperService } from './services/whisper/whisper.service';
import { AudioService } from './services/audio/audio.service';
import { VitsService } from './services/vits/vits.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    importProvidersFrom(HttpClientModule),
    ConversationService,
    AssistantService,
    UserService,
    InstanceOfPipe,
    WhisperService,
    AudioService,
    VitsService
  ],
};
