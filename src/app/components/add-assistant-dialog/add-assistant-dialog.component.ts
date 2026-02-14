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
import { ButtonMessage } from '../../models/button-message.model';
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

  // WebLLM available models by family (flattened for dropdown via allAvailableModels) (from prebuiltAppConfig)
  availableModelGroups: { family: string; models: { id: string; name: string }[] }[] = [
    {
      family: 'Llama Family',
      models: [
        { id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC', name: 'Llama-3.2-1B-Instruct-q4f32_1-MLC' },
        { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama-3.2-1B-Instruct-q4f16_1-MLC' },
        { id: 'Llama-3.2-1B-Instruct-q0f16-MLC', name: 'Llama-3.2-1B-Instruct-q0f16-MLC' },
        { id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC', name: 'Llama-3.2-3B-Instruct-q4f32_1-MLC' },
        { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama-3.2-3B-Instruct-q4f16_1-MLC' },
        { id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC-1k', name: 'Llama-3.1-8B-Instruct-q4f32_1-MLC-1k' },
        { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC-1k', name: 'Llama-3.1-8B-Instruct-q4f16_1-MLC-1k' },
        { id: 'Llama-3.1-8B-Instruct-q4f32_1-MLC', name: 'Llama-3.1-8B-Instruct-q4f32_1-MLC' },
        { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', name: 'Llama-3.1-8B-Instruct-q4f16_1-MLC' },
        { id: 'Llama-3.1-70B-Instruct-q3f16_1-MLC', name: 'Llama-3.1-70B-Instruct-q3f16_1-MLC' },
        { id: 'Llama-3-8B-Instruct-q4f32_1-MLC-1k', name: 'Llama-3-8B-Instruct-q4f32_1-MLC-1k' },
        { id: 'Llama-3-8B-Instruct-q4f16_1-MLC-1k', name: 'Llama-3-8B-Instruct-q4f16_1-MLC-1k' },
        { id: 'Llama-3-8B-Instruct-q4f32_1-MLC', name: 'Llama-3-8B-Instruct-q4f32_1-MLC' },
        { id: 'Llama-3-8B-Instruct-q4f16_1-MLC', name: 'Llama-3-8B-Instruct-q4f16_1-MLC' },
        { id: 'Llama-3-70B-Instruct-q3f16_1-MLC', name: 'Llama-3-70B-Instruct-q3f16_1-MLC' },
        { id: 'Llama-2-7b-chat-hf-q4f32_1-MLC-1k', name: 'Llama-2-7b-chat-hf-q4f32_1-MLC-1k' },
        { id: 'Llama-2-7b-chat-hf-q4f16_1-MLC-1k', name: 'Llama-2-7b-chat-hf-q4f16_1-MLC-1k' },
        { id: 'Llama-2-7b-chat-hf-q4f32_1-MLC', name: 'Llama-2-7b-chat-hf-q4f32_1-MLC' },
        { id: 'Llama-2-7b-chat-hf-q4f16_1-MLC', name: 'Llama-2-7b-chat-hf-q4f16_1-MLC' },
        { id: 'Llama-2-13b-chat-hf-q4f16_1-MLC', name: 'Llama-2-13b-chat-hf-q4f16_1-MLC' },
      ],
    },
    {
      family: 'DeepSeek (Distilled)',
      models: [
        { id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC', name: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC' },
        { id: 'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC', name: 'DeepSeek-R1-Distill-Qwen-7B-q4f32_1-MLC' },
        { id: 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC', name: 'DeepSeek-R1-Distill-Llama-8B-q4f32_1-MLC' },
        { id: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC', name: 'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC' },
      ],
    },
    {
      family: 'Hermes',
      models: [
        { id: 'Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC', name: 'Hermes-2-Theta-Llama-3-8B-q4f16_1-MLC' },
        { id: 'Hermes-2-Theta-Llama-3-8B-q4f32_1-MLC', name: 'Hermes-2-Theta-Llama-3-8B-q4f32_1-MLC' },
        { id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC', name: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC' },
        { id: 'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC', name: 'Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC' },
        { id: 'Hermes-3-Llama-3.2-3B-q4f32_1-MLC', name: 'Hermes-3-Llama-3.2-3B-q4f32_1-MLC' },
        { id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC', name: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC' },
        { id: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC', name: 'Hermes-3-Llama-3.1-8B-q4f32_1-MLC' },
        { id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC', name: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC' },
        { id: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC', name: 'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC' },
        { id: 'OpenHermes-2.5-Mistral-7B-q4f16_1-MLC', name: 'OpenHermes-2.5-Mistral-7B-q4f16_1-MLC' },
        { id: 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC', name: 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC' },
      ],
    },
    {
      family: 'Qwen',
      models: [
        { id: 'Qwen3-0.6B-q4f16_1-MLC', name: 'Qwen3-0.6B-q4f16_1-MLC' },
        { id: 'Qwen3-0.6B-q4f32_1-MLC', name: 'Qwen3-0.6B-q4f32_1-MLC' },
        { id: 'Qwen3-0.6B-q0f16-MLC', name: 'Qwen3-0.6B-q0f16-MLC' },
        { id: 'Qwen3-1.7B-q4f16_1-MLC', name: 'Qwen3-1.7B-q4f16_1-MLC' },
        { id: 'Qwen3-1.7B-q4f32_1-MLC', name: 'Qwen3-1.7B-q4f32_1-MLC' },
        { id: 'Qwen3-4B-q4f16_1-MLC', name: 'Qwen3-4B-q4f16_1-MLC' },
        { id: 'Qwen3-4B-q4f32_1-MLC', name: 'Qwen3-4B-q4f32_1-MLC' },
        { id: 'Qwen3-8B-q4f16_1-MLC', name: 'Qwen3-8B-q4f16_1-MLC' },
        { id: 'Qwen3-8B-q4f32_1-MLC', name: 'Qwen3-8B-q4f32_1-MLC' },
        { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-0.5B-Instruct-q0f16-MLC', name: 'Qwen2.5-0.5B-Instruct-q0f16-MLC' },
        { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-3B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-3B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-3B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-7B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-7B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-7B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-Coder-0.5B-Instruct-q0f16-MLC', name: 'Qwen2.5-Coder-0.5B-Instruct-q0f16-MLC' },
        { id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-Coder-1.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-Coder-3B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-Coder-7B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen2.5-Math-1.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2-0.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2-0.5B-Instruct-q0f16-MLC', name: 'Qwen2-0.5B-Instruct-q0f16-MLC' },
        { id: 'Qwen2-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2-1.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen2-1.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2-7B-Instruct-q4f16_1-MLC', name: 'Qwen2-7B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2-7B-Instruct-q4f32_1-MLC', name: 'Qwen2-7B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2-Math-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen2-Math-1.5B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2-Math-1.5B-Instruct-q4f32_1-MLC', name: 'Qwen2-Math-1.5B-Instruct-q4f32_1-MLC' },
        { id: 'Qwen2-Math-7B-Instruct-q4f16_1-MLC', name: 'Qwen2-Math-7B-Instruct-q4f16_1-MLC' },
        { id: 'Qwen2-Math-7B-Instruct-q4f32_1-MLC', name: 'Qwen2-Math-7B-Instruct-q4f32_1-MLC' },
      ],
    },
    {
      family: 'Phi',
      models: [
        { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi-3.5-mini-instruct-q4f16_1-MLC' },
        { id: 'Phi-3.5-mini-instruct-q4f32_1-MLC', name: 'Phi-3.5-mini-instruct-q4f32_1-MLC' },
        { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k', name: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k' },
        { id: 'Phi-3.5-mini-instruct-q4f32_1-MLC-1k', name: 'Phi-3.5-mini-instruct-q4f32_1-MLC-1k' },
        { id: 'Phi-3.5-vision-instruct-q4f16_1-MLC', name: 'Phi-3.5-vision-instruct-q4f16_1-MLC' },
        { id: 'Phi-3.5-vision-instruct-q4f32_1-MLC', name: 'Phi-3.5-vision-instruct-q4f32_1-MLC' },
        { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3-mini-4k-instruct-q4f16_1-MLC' },
        { id: 'Phi-3-mini-4k-instruct-q4f32_1-MLC', name: 'Phi-3-mini-4k-instruct-q4f32_1-MLC' },
        { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC-1k', name: 'Phi-3-mini-4k-instruct-q4f16_1-MLC-1k' },
        { id: 'Phi-3-mini-4k-instruct-q4f32_1-MLC-1k', name: 'Phi-3-mini-4k-instruct-q4f32_1-MLC-1k' },
        { id: 'phi-2-q4f16_1-MLC', name: 'phi-2-q4f16_1-MLC' },
        { id: 'phi-2-q4f32_1-MLC', name: 'phi-2-q4f32_1-MLC' },
        { id: 'phi-2-q4f16_1-MLC-1k', name: 'phi-2-q4f16_1-MLC-1k' },
        { id: 'phi-2-q4f32_1-MLC-1k', name: 'phi-2-q4f32_1-MLC-1k' },
        { id: 'phi-1_5-q4f16_1-MLC', name: 'phi-1_5-q4f16_1-MLC' },
        { id: 'phi-1_5-q4f32_1-MLC', name: 'phi-1_5-q4f32_1-MLC' },
        { id: 'phi-1_5-q4f16_1-MLC-1k', name: 'phi-1_5-q4f16_1-MLC-1k' },
        { id: 'phi-1_5-q4f32_1-MLC-1k', name: 'phi-1_5-q4f32_1-MLC-1k' },
      ],
    },
    {
      family: 'Gemma',
      models: [
        { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'gemma-2-2b-it-q4f16_1-MLC' },
        { id: 'gemma-2-2b-it-q4f32_1-MLC', name: 'gemma-2-2b-it-q4f32_1-MLC' },
        { id: 'gemma-2-2b-it-q4f16_1-MLC-1k', name: 'gemma-2-2b-it-q4f16_1-MLC-1k' },
        { id: 'gemma-2-2b-it-q4f32_1-MLC-1k', name: 'gemma-2-2b-it-q4f32_1-MLC-1k' },
        { id: 'gemma-2-9b-it-q4f16_1-MLC', name: 'gemma-2-9b-it-q4f16_1-MLC' },
        { id: 'gemma-2-9b-it-q4f32_1-MLC', name: 'gemma-2-9b-it-q4f32_1-MLC' },
        { id: 'gemma-2-2b-jpn-it-q4f16_1-MLC', name: 'gemma-2-2b-jpn-it-q4f16_1-MLC' },
        { id: 'gemma-2-2b-jpn-it-q4f32_1-MLC', name: 'gemma-2-2b-jpn-it-q4f32_1-MLC' },
        { id: 'gemma-2b-it-q4f16_1-MLC', name: 'gemma-2b-it-q4f16_1-MLC' },
        { id: 'gemma-2b-it-q4f32_1-MLC', name: 'gemma-2b-it-q4f32_1-MLC' },
        { id: 'gemma-2b-it-q4f16_1-MLC-1k', name: 'gemma-2b-it-q4f16_1-MLC-1k' },
        { id: 'gemma-2b-it-q4f32_1-MLC-1k', name: 'gemma-2b-it-q4f32_1-MLC-1k' },
      ],
    },
    {
      family: 'Mistral & SmolLM',
      models: [
        { id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC', name: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC' },
        { id: 'Mistral-7B-Instruct-v0.3-q4f32_1-MLC', name: 'Mistral-7B-Instruct-v0.3-q4f32_1-MLC' },
        { id: 'Mistral-7B-Instruct-v0.2-q4f16_1-MLC', name: 'Mistral-7B-Instruct-v0.2-q4f16_1-MLC' },
        { id: 'WizardMath-7B-V1.1-q4f16_1-MLC', name: 'WizardMath-7B-V1.1-q4f16_1-MLC' },
        { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC' },
        { id: 'SmolLM2-1.7B-Instruct-q4f32_1-MLC', name: 'SmolLM2-1.7B-Instruct-q4f32_1-MLC' },
        { id: 'SmolLM2-360M-Instruct-q0f16-MLC', name: 'SmolLM2-360M-Instruct-q0f16-MLC' },
        { id: 'SmolLM2-360M-Instruct-q0f32-MLC', name: 'SmolLM2-360M-Instruct-q0f32-MLC' },
        { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', name: 'SmolLM2-360M-Instruct-q4f16_1-MLC' },
        { id: 'SmolLM2-360M-Instruct-q4f32_1-MLC', name: 'SmolLM2-360M-Instruct-q4f32_1-MLC' },
        { id: 'SmolLM2-135M-Instruct-q0f16-MLC', name: 'SmolLM2-135M-Instruct-q0f16-MLC' },
        { id: 'SmolLM2-135M-Instruct-q0f32-MLC', name: 'SmolLM2-135M-Instruct-q0f32-MLC' },
        { id: 'Ministral-3-3B-Base-2512-q4f16_1-MLC', name: 'Ministral-3-3B-Base-2512-q4f16_1-MLC' },
        { id: 'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC', name: 'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC' },
        { id: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC', name: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC' },
      ],
    },
    {
      family: 'Other',
      models: [
        { id: 'stablelm-2-zephyr-1_6b-q4f16_1-MLC', name: 'stablelm-2-zephyr-1_6b-q4f16_1-MLC' },
        { id: 'stablelm-2-zephyr-1_6b-q4f32_1-MLC', name: 'stablelm-2-zephyr-1_6b-q4f32_1-MLC' },
        { id: 'stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k', name: 'stablelm-2-zephyr-1_6b-q4f16_1-MLC-1k' },
        { id: 'stablelm-2-zephyr-1_6b-q4f32_1-MLC-1k', name: 'stablelm-2-zephyr-1_6b-q4f32_1-MLC-1k' },
        { id: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC', name: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC' },
        { id: 'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC', name: 'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC' },
        { id: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k', name: 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k' },
        { id: 'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC-1k', name: 'RedPajama-INCITE-Chat-3B-v1-q4f32_1-MLC-1k' },
        { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', name: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC' },
        { id: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC', name: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC' },
        { id: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k', name: 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC-1k' },
        { id: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC-1k', name: 'TinyLlama-1.1B-Chat-v1.0-q4f32_1-MLC-1k' },
        { id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC', name: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC' },
        { id: 'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC', name: 'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC' },
        { id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k', name: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k' },
        { id: 'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k', name: 'TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k' },
      ],
    },
  ];

  /** Flat list of all models (for lookups). */
  get allAvailableModels(): { id: string; name: string }[] {
    return this.availableModelGroups.flatMap((g) => g.models);
  }

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

      await this.checkModelCacheAndNotify(assistant, this.selectedModel);

      this.assistantCreated.emit(assistant);

      // Navigate to the chat page for this assistant
      this.closeDialog();
      this.router.navigate(['/chat', assistant.id]);
    }

    if (this.editingAssistant) {
      await this.checkModelCacheAndNotify(this.editingAssistant, this.selectedModel);
      this.closeDialog();
    }
  }

  private async addIntroMessage(assistant: Assistant): Promise<void> {
    const modelName = this.allAvailableModels.find((m) => m.id === this.selectedModel)?.name || this.selectedModel;

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

  /**
   * Check cache for the model and send a status message. If not cached, start download and message when done.
   */
  private async checkModelCacheAndNotify(assistant: Assistant, modelId: string): Promise<void> {
    const modelName = this.allAvailableModels.find((m) => m.id === modelId)?.name ?? modelId;
    const isCached = await this.llmService.isModelCached(modelId);

    if (isCached) {
      assistant.sendMessage(
        new TextMessage(
          assistant,
          `The language model "${modelName}" is in cache and ready to use.`,
          new Date()
        ),
        false
      );
      return;
    }
    if (this.llmService.isModelInitInProgress(modelId)) return;

    const progressMsg = new TextMessage(
      assistant,
      `The language model "${modelName}" is not in cache. Starting download...`,
      new Date(),
      0
    );
    assistant.sendMessage(progressMsg, false);

    this.llmService
      .init(modelId, (report) => {
        progressMsg.progress = Math.round(report.progress * 100);
        assistant.onMessageSent?.();
      })
      .then(() => {
        progressMsg.progress = 100;
        assistant.onMessageSent?.();
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `"${modelName}" has been downloaded and is ready.`,
            new Date()
          ),
          false
        );
      })
      .catch(() => {
        assistant.sendMessage(
          new TextMessage(
            assistant,
            `There was a problem downloading the language model.`,
            new Date()
          ),
          false
        );
        assistant.sendMessage(
          new ButtonMessage(
            assistant,
            'Download Model',
            new Date(),
            'assets/img/download.svg',
            'button-1',
            () => this.checkModelCacheAndNotify(assistant, modelId)
          ),
          false
        );
      });
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

