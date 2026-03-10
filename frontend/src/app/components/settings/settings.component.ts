import { Component, inject, signal, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideCheckCircle, lucideXCircle } from '@ng-icons/lucide';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideEye,
      lucideEyeOff,
      lucideCheckCircle,
      lucideXCircle,
    }),
  ],
  template: `
    <div class="settings-page">
      <div class="settings-header">
        <h2>Settings</h2>
        <p class="settings-desc">Configure your LLM provider and API keys</p>
      </div>

      <!-- Provider Selection -->
      <div class="settings-card">
        <h3>LLM Provider</h3>
        <div class="form-group">
          <label class="form-label">Active Provider</label>
          <select
            class="form-select"
            [value]="provider()"
            (change)="onProviderChange($event)"
          >
            <option value="gemini">Gemini (Google)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>
      </div>

      <!-- API Key Configuration -->
      <div class="settings-card">
        <h3>API Keys</h3>
        <p class="card-desc">Each user uses their own API key. Keys are stored locally.</p>

        @for (p of providers; track p.key) {
          <div class="form-group">
            <label class="form-label">
              {{ p.label }}
              @if (provider() === p.key) {
                <span class="badge-active">Active</span>
              }
            </label>
            <div class="input-group">
              <input
                [type]="showKeys().has(p.key) ? 'text' : 'password'"
                class="form-input"
                [placeholder]="p.placeholder"
                [value]="keys()[p.key] || ''"
                (input)="onKeyInput(p.key, $event)"
              />
              <button
                class="btn btn-ghost btn-sm"
                (click)="toggleShowKey(p.key)"
                [title]="showKeys().has(p.key) ? 'Hide key' : 'Show key'"
              >
                <ng-icon [name]="showKeys().has(p.key) ? 'lucideEyeOff' : 'lucideEye'" size="16" />
              </button>
              <button
                class="btn btn-sm"
                (click)="validateKey(p.key)"
                [disabled]="validating()"
              >
                {{ validating() ? '…' : 'Test' }}
              </button>
            </div>
            @if (validationResults()[p.key]) {
              <div class="validation-result" [class.valid]="validationResults()[p.key] === 'valid'">
                @if (validationResults()[p.key] === 'valid') {
                  <ng-icon name="lucideCheckCircle" size="14" class="mr-1" />
                  <span>Valid</span>
                } @else {
                  <ng-icon name="lucideXCircle" size="14" class="mr-1" />
                  <span>{{ validationResults()[p.key] }}</span>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Save Button -->
      <div class="settings-actions">
        <button class="btn btn-primary" (click)="saveSettings()" [disabled]="saving()">
          {{ saving() ? 'Saving…' : 'Save Settings' }}
        </button>
        @if (saved()) {
          <span class="save-success">
            <ng-icon name="lucideCheckCircle" size="14" class="mr-1" />
            Settings saved!
          </span>
        }
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 640px;
      margin: 0 auto;
      padding: var(--space-8);
    }

    .settings-header {
      margin-bottom: var(--space-8);
    }

    .settings-header h2 {
      font-size: var(--text-2xl);
      font-weight: var(--font-semibold);
    }

    .settings-desc, .card-desc {
      color: var(--text-muted);
      font-size: var(--text-sm);
      margin-top: var(--space-1);
    }

    .settings-card {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      margin-bottom: var(--space-6);
    }

    .settings-card h3 {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      margin-bottom: var(--space-4);
    }

    .form-group {
      margin-bottom: var(--space-4);
    }

    .form-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text);
      margin-bottom: var(--space-2);
    }

    .badge-active {
      font-size: 10px;
      padding: 1px var(--space-2);
      background: var(--primary-tint);
      color: var(--primary);
      border-radius: var(--radius-sm);
      font-weight: var(--font-medium);
      letter-spacing: var(--tracking-caps);
      text-transform: uppercase;
    }

    .form-select, .form-input {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      font-size: var(--text-sm);
      font-family: var(--font-body);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface-1);
      color: var(--text);
      outline: none;
    }

    .form-select:focus, .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-tint);
    }

    .input-group {
      display: flex;
      gap: var(--space-2);
    }

    .input-group .form-input { flex: 1; }

    .validation-result {
      font-size: var(--text-xs);
      margin-top: var(--space-1);
      color: var(--danger);
    }

    .validation-result.valid { color: var(--success); }

    .settings-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .save-success {
      font-size: var(--text-sm);
      color: var(--success);
    }
  `],
})
export class SettingsComponent implements OnInit {
  private api = inject(ApiService);

  readonly provider = signal('gemini');
  readonly keys = signal<Record<string, string>>({});
  readonly showKeys = signal(new Set<string>());
  readonly validating = signal(false);
  readonly validationResults = signal<Record<string, string>>({});
  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly providers = [
    { key: 'gemini', label: 'Gemini API Key', placeholder: 'AIza...' },
    { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
    { key: 'claude', label: 'Claude API Key', placeholder: 'sk-ant-...' },
    { key: 'ollama', label: 'Ollama Base URL', placeholder: 'http://localhost:11434' },
  ];

  ngOnInit() {
    this.api.getSettings().subscribe({
      next: (settings) => {
        if (settings['llm_provider']) {
          this.provider.set(settings['llm_provider']);
        }
        const loadedKeys: Record<string, string> = {};
        for (const p of this.providers) {
          const settingKey = 'llm_key_' + p.key;
          if (settings[settingKey]) {
            loadedKeys[p.key] = settings[settingKey];
          }
        }
        this.keys.set(loadedKeys);
      },
    });
  }

  onProviderChange(event: Event) {
    this.provider.set((event.target as HTMLSelectElement).value);
  }

  onKeyInput(provider: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.keys.update((k) => ({ ...k, [provider]: value }));
  }

  toggleShowKey(provider: string) {
    const current = new Set(this.showKeys());
    if (current.has(provider)) {
      current.delete(provider);
    } else {
      current.add(provider);
    }
    this.showKeys.set(current);
  }

  validateKey(provider: string) {
    const key = this.keys()[provider];
    if (!key) return;

    this.validating.set(true);
    this.api.validateLLMKey(provider, key).subscribe({
      next: (res) => {
        this.validationResults.update((r) => ({
          ...r,
          [provider]: res.valid ? 'valid' : res.message,
        }));
        this.validating.set(false);
      },
      error: (err) => {
        this.validationResults.update((r) => ({
          ...r,
          [provider]: err.message,
        }));
        this.validating.set(false);
      },
    });
  }

  saveSettings() {
    this.saving.set(true);
    this.saved.set(false);

    const settings: Record<string, string> = {
      llm_provider: this.provider(),
    };

    for (const [key, value] of Object.entries(this.keys())) {
      if (value && !value.includes('****')) {
        settings['llm_key_' + key] = value;
      }
    }

    this.api.updateSettings(settings).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 3000);
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
