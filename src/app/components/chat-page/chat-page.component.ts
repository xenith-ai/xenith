import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatComponent } from '../chat/chat.component';
import { AssistantService } from '../../services/assistant/assistant.service';
import { UserService } from '../../services/user/user.service';
import { AudioService } from '../../services/audio/audio.service';
import { WhisperService } from '../../services/whisper/whisper.service';
import { IndexedDBService } from '../../services/indexed-db/indexed-db.service';
import { ModelKey } from '../../enums/model-key.enum';
import { AudioProcessor } from '../../enums/audio-processor.enum';
import { Assistant } from '../../models/assistant.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent implements OnInit {
  assistant: Assistant | null = null;
  currentUser: User;
  assistantId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assistantService: AssistantService,
    private userService: UserService,
    private audioService: AudioService,
    private whisperService: WhisperService,
    private indexedDBService: IndexedDBService
  ) {
    this.currentUser = this.userService.createUser();
  }

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async params => {
      const id = params.get('assistantId');
      if (id) {
        this.assistantId = id;
        await this.loadAssistant(id);
      }
    });
  }

  private async loadAssistant(id: string): Promise<void> {
    const assistant = this.assistantService.getAssistantById(id);
    if (assistant) {
      this.assistant = assistant;
      await this.initializeAudio();
    } else {
      // Assistant not found, redirect to landing page
      this.router.navigate(['/']);
    }
  }

  private async initializeAudio(): Promise<void> {
    if (!this.assistant) return;

    // Check if microphone access is granted
    if (await this.audioService.isMicrophoneEnabled(() => {})) {
      // Load Whisper model if needed
      if (!this.whisperService.whisperInstance) {
        const cachedWhisperModel = await this.indexedDBService.readModel(
          ModelKey.WhisperTinyEn
        );
        if (cachedWhisperModel) {
          // Wait for module if not loaded
          if (!this.whisperService.whisperModule) {
            await this.whisperService.waitForModule();
          }
          // Load the model
          await this.whisperService.loadModel(cachedWhisperModel);
          // Initialize Whisper (starts polling)
          await this.whisperService.initWhisper();
        }
      }

      // Start listening if not already started
      if (!this.audioService.listening) {
        await this.audioService.startListening();
      }

      // Ensure the assistant is registered and processor is started
      // The assistant is registered in its constructor, but we need to ensure
      // the processor state is correct. If processing state is false, re-register
      // to trigger startProcessor
      if (!this.audioService.processingStates.get(AudioProcessor.Whisper)) {
        // Re-register to ensure processor is started
        // This is safe - registerCallback will update the existing callback if already registered
        this.audioService.registerCallback(
          this.assistant.id,
          AudioProcessor.Whisper,
          (this.assistant as any).onTranscription.bind(this.assistant)
        );
      }
    }
  }
}

