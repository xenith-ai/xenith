import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistantService } from '../../services/assistant/assistant.service';
import { UserService } from '../../services/user/user.service';
import { VitsService } from '../../services/vits/vits.service';
import { Assistant } from '../../models/assistant.model';
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
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() assistantCreated = new EventEmitter<Assistant>();

  assistantName: string = '';
  wakeWord: string = '';
  avatar: string = 'assets/img/robo.webp';
  selectedVoice: VoiceId = 'en_US-hfc_female-medium';

  constructor(
    private assistantService: AssistantService,
    private userService: UserService,
    public vitsService: VitsService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadVoicesIfNeeded();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      await this.loadVoicesIfNeeded();
    }
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
    this.avatar = 'assets/img/robo.webp';
    this.selectedVoice = 'en_US-hfc_female-medium';
  }

  createAssistant(): void {
    if (!this.assistantName.trim() || !this.wakeWord.trim()) {
      return;
    }

    const user = this.userService.createUser();
    const assistant = this.assistantService.createAssistant(
      this.assistantName.trim(),
      this.avatar,
      this.wakeWord.trim().toLowerCase(),
      user
    );

    // Set the voice ID
    assistant.voiceId = this.selectedVoice;

    this.assistantCreated.emit(assistant);
    this.closeDialog();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.closeDialog();
    }
  }
}

