import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AssistantService } from '../../services/assistant/assistant.service';
import { UserService } from '../../services/user/user.service';
import { VitsService } from '../../services/vits/vits.service';
import { LLMService } from '../../services/llm/llm.service';
import { Assistant } from '../../models/assistant.model';
import { TextMessage } from '../../models/text-message.model';
import { VoiceId } from '@diffusionstudio/vits-web';

@Component({
  selector: 'app-add-assistant-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-assistant-dialog.component.html',
  styleUrl: './add-assistant-dialog.component.scss',
})
export class AddAssistantDialogComponent implements OnInit, OnChanges {
  @Input() isOpen: boolean = false;
  @Input() editingAssistant: Assistant | null = null;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() assistantCreated = new EventEmitter<Assistant>();
  @Output() assistantUpdated = new EventEmitter<Assistant>();
  @Output() assistantDeleted = new EventEmitter<Assistant>();

  readonly DEFAULT_AVATAR = 'assets/img/robo.webp';

  assistantName: string = '';
  wakeWord: string = '';
  /** Value shown in the avatar input; empty means use default (not shown to user). */
  avatarDisplay: string = '';
  selectedVoice: VoiceId = 'en_US-hfc_female-medium';
  selectedModel: string = 'gemma-2-2b-jpn-it-q4f16_1-MLC';

  // List of available models (common WebLLM models)
  availableModels = [
    { id: 'gemma-2-2b-jpn-it-q4f16_1-MLC', name: 'Gemma 2 2B (Japanese, Q4)' },
    { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B (Q4)' },
    { id: 'gemma-2-9b-it-q4f16_1-MLC', name: 'Gemma 2 9B (Q4)' },
    { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', name: 'Llama 3.1 8B Instruct (Q4)' },
    { id: 'Llama-3.1-70B-Instruct-q4f16_1-MLC', name: 'Llama 3.1 70B Instruct (Q4)' },
    { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3 Mini 4K Instruct (Q4)' },
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 0.5B Instruct (Q4)' },
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 1.5B Instruct (Q4)' },
    { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', name: 'Qwen2.5 3B Instruct (Q4)' },
    { id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC', name: 'TinyLlama 1.1B Chat (Q4)' },
  ];

  constructor(
    private assistantService: AssistantService,
    private userService: UserService,
    public vitsService: VitsService,
    private llmService: LLMService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadVoicesIfNeeded();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      await this.loadVoicesIfNeeded();
      if (this.editingAssistant) {
        this.loadAssistantData();
      } else {
        this.resetForm();
      }
    }
    if (changes['editingAssistant']) {
      if (this.editingAssistant && this.isOpen) {
        this.loadAssistantData();
      } else if (!this.editingAssistant && this.isOpen) {
        this.resetForm();
      }
    }
  }

  private loadAssistantData(): void {
    if (!this.editingAssistant) return;

    this.assistantName = this.editingAssistant.name;
    this.wakeWord = this.editingAssistant.wakeWord;
    this.avatarDisplay = this.editingAssistant.avatar === this.DEFAULT_AVATAR ? '' : this.editingAssistant.avatar;
    this.selectedVoice = this.editingAssistant.voiceId;
    this.selectedModel = this.editingAssistant.modelId;
  }

  private getEffectiveAvatar(): string {
    return this.avatarDisplay?.trim() || this.DEFAULT_AVATAR;
  }

  private async loadVoicesIfNeeded(): Promise<void> {
    if (this.vitsService.voiceList.length === 0) {
      await this.vitsService.loadVoices();
    }
  }

  get availableVoices() {
    return this.vitsService.voiceList;
  }

  closeDialog(): void {
    this.isOpenChange.emit(false);
    this.resetForm();
  }

  resetForm(): void {
    this.assistantName = '';
    this.wakeWord = '';
    this.avatarDisplay = '';
    this.selectedVoice = 'en_US-hfc_female-medium';
    this.selectedModel = 'gemma-2-2b-jpn-it-q4f16_1-MLC';
  }

  async createAssistant(): Promise<void> {
    if (!this.assistantName.trim() || !this.wakeWord.trim()) {
      return;
    }

    if (this.editingAssistant) {
      // Update existing assistant
      this.editingAssistant.name = this.assistantName.trim();
      this.editingAssistant.wakeWord = this.wakeWord.trim().toLowerCase();
      this.editingAssistant.avatar = this.getEffectiveAvatar();
      this.editingAssistant.voiceId = this.selectedVoice;
      this.editingAssistant.modelId = this.selectedModel;
      this.assistantUpdated.emit(this.editingAssistant);
    } else {
      // Create new assistant
      const user = this.userService.createUser();
      const assistant = this.assistantService.createAssistant(
        this.assistantName.trim(),
        this.getEffectiveAvatar(),
        this.wakeWord.trim().toLowerCase(),
        user,
        this.selectedModel
      );

      // Set the voice ID
      assistant.voiceId = this.selectedVoice;

      // Intro only; chat page will autostart download and show progress when user lands there
      await this.addIntroMessage(assistant);

      this.assistantCreated.emit(assistant);

      // Navigate to the chat page for this assistant
      this.closeDialog();
      this.router.navigate(['/chat', assistant.id]);
    }

    if (this.editingAssistant) {
      this.closeDialog();
    }
  }

  private async addIntroMessage(assistant: Assistant): Promise<void> {
    const modelName = this.availableModels.find(m => m.id === this.selectedModel)?.name || this.selectedModel;

    // Check if models are cached
    const isLLMCached = await this.llmService.isModelCached(this.selectedModel);
    const isVitsCached = this.vitsService.isVoiceDownloaded(this.selectedVoice);

    let message = `Hello! I'm ${assistant.name}. `;

    if (isLLMCached && isVitsCached) {
      message += `All required models are ready. I'm using the ${modelName} model. You can start talking to me using my wake word "${assistant.wakeWord}"!`;
    } else {
      message += `I'm setting up my AI models. `;
      const missingModels: string[] = [];
      if (!isLLMCached) {
        missingModels.push(`the ${modelName} language model`);
      }
      if (!isVitsCached) {
        missingModels.push('the voice synthesis model');
      }
      message += `I need to download ${missingModels.join(' and ')}. This may take a few minutes depending on your connection. Once downloaded, I'll be ready to chat!`;
    }

    assistant.sendMessage(
      new TextMessage(
        assistant,
        message,
        new Date()
      ),
      false
    );
  }

  onBackdropMousedown(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.closeDialog();
    }
  }

  deleteAssistant(): void {
    if (this.editingAssistant) {
      if (confirm(`Are you sure you want to delete "${this.editingAssistant.name}"? This action cannot be undone.`)) {
        this.assistantDeleted.emit(this.editingAssistant);
        this.closeDialog();
      }
    }
  }
}

