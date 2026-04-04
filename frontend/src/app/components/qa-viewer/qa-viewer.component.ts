import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef, AfterViewChecked, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownComponent } from 'ngx-markdown';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideZap, lucideFile, lucideMessageSquare, lucideChevronLeft, lucideSend, lucideUser, lucideBot, lucideTrash } from '@ng-icons/lucide';
import { QAResponse } from '../../models/api.models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: QAResponse['used_files'];
  timestamp: number;
}

@Component({
  selector: 'app-qa-viewer',
  standalone: true,
  imports: [CommonModule, MarkdownComponent, NgIcon, FormsModule],
  providers: [provideIcons({ lucideZap, lucideFile, lucideMessageSquare, lucideChevronLeft, lucideSend, lucideUser, lucideBot, lucideTrash })],
  template: `
    <div class="chat-container">
      <header class="chat-header">
        <div class="header-main">
          <button class="back-btn" (click)="goBack.emit()">
            <ng-icon name="lucideChevronLeft" size="16" />
            Exit Chat
          </button>
          <div class="header-info">
            <h1>Code Intelligence</h1>
            <p class="status-badge"><span class="dot"></span> Online AI Assistant</p>
          </div>
          <button class="new-chat-btn" (click)="clearChat()" title="Start New Session">
            <ng-icon name="lucideTrash" size="16" />
          </button>
        </div>
      </header>

      <div class="messages-viewport" #scrollViewport>
        <div class="messages-list">
          @for (msg of messages(); track msg.timestamp) {
            <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
              <div class="avatar" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'">
                <ng-icon [name]="msg.role === 'user' ? 'lucideUser' : 'lucideBot'" size="18" />
              </div>
              <div class="bubble-group">
                <div class="bubble">
                  <div class="markdown-body">
                    <markdown [data]="msg.content"></markdown>
                  </div>
                </div>
                
                @if (msg.files?.length) {
                  <div class="source-context">
                    @for (file of msg.files; track file.file_path) {
                      <button class="source-chip" (click)="fileSelect.emit(file.file_path)">
                        <ng-icon name="lucideFile" size="12" />
                        {{ getFileName(file.file_path) }}
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
          
          @if (isThinking()) {
            <div class="message assistant thinking-state">
              <div class="avatar assistant">
                <ng-icon name="lucideBot" size="18" />
              </div>
              <div class="bubble thinking-bubble">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
            </div>
          }
        </div>
      </div>

      <footer class="chat-footer">
        <div class="input-container">
          <textarea 
            #chatInput
            [(ngModel)]="currentInput" 
            (keydown.enter)="handleEnter($event)"
            placeholder="Ask anything about your project..."
            rows="1"
          ></textarea>
          <button class="send-btn" [disabled]="!currentInput.trim() || isThinking()" (click)="onSend()">
            <ng-icon name="lucideSend" size="18" />
          </button>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow: hidden; background: var(--bg); }
    
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    /* --- Header --- */
    .chat-header {
      padding: 16px 24px;
      padding-top: 20px;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      z-index: 10;
    }
    .header-main { display: flex; align-items: center; gap: 16px; width: 100%; }
    .header-info { flex: 1; text-align: center; }
    .header-info h1 { font-size: 15px; font-weight: 700; margin: 0; color: var(--primary); letter-spacing: -0.01em; }
    .status-badge { font-size: 10px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 2px; }
    .status-badge .dot { width: 6.5px; height: 6.5px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 12px;
      color: var(--text);
      cursor: pointer;
      transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .back-btn:hover { background: var(--surface-3); transform: translateX(-2px); }

    .new-chat-btn {
      padding: 8px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: #ef4444;
      cursor: pointer;
      transition: all 150ms;
    }
    .new-chat-btn:hover { background: rgba(239, 68, 68, 0.1); transform: rotate(8deg); }

    /* --- Messages Area --- */
    .messages-viewport {
      flex: 1;
      overflow-y: auto;
      padding: 32px 0;
      scroll-behavior: smooth;
    }
    .messages-list {
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .message { display: flex; gap: 16px; max-width: 90%; animation: message-in 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
    .message.user { align-self: flex-end; flex-direction: row-reverse; }
    .message.assistant { align-self: flex-start; }

    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--surface-2);
      border: 1px solid var(--border);
    }
    .avatar.user { background: var(--primary); color: white; border: none; }
    .avatar.assistant { color: var(--primary); }

    .bubble-group { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .bubble {
      padding: 14px 18px;
      border-radius: 20px;
      font-size: 14px;
      line-height: 1.6;
      word-break: break-word;
      box-shadow: 0 4px 15px rgba(0,0,0,0.03);
    }
    .user .bubble { background: var(--primary); color: white; border-top-right-radius: 4px; }
    .assistant .bubble { background: var(--surface-1); border: 1px solid var(--border); border-top-left-radius: 4px; color: var(--text); }

    .source-context { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .source-chip {
    .thinking-bubble .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.1); opacity: 1; } }

    /* --- Footer Input --- */
    .chat-footer {
      padding: var(--space-4) var(--space-8) var(--space-6);
      background: var(--bg);
      border-top: 1px solid var(--border);
    }
    .input-wrapper {
      max-width: 800px;
      margin: 0 auto;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 8px 12px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      box-shadow: var(--shadow-lg);
      transition: border-color 200ms;
    }
    .input-wrapper:focus-within { border-color: var(--primary); }

    textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      padding: 8px 0;
      resize: none;
      outline: none;
      max-height: 200px;
    }
    .send-btn {
      width: 36px; height: 36px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 150ms, opacity 150ms;
    }
    .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .send-btn:hover:not(:disabled) { transform: scale(1.05); }

    .footer-hint {
      text-align: center;
      margin-top: 8px;
      font-size: 10px;
      color: var(--text-disabled);
    }

    .markdown-body :global(pre) {
      background: #0f172a;
      padding: 1.2rem;
      border-radius: 12px;
      font-size: 13px;
      margin: 1rem 0;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .markdown-body :global(code) { color: #5eead4; }
  `],
})
export class QAViewerComponent implements AfterViewChecked {
  @Input() set initialQuestion(val: string) {
    if (val && this.messages().length === 0) {
      this.messages.set([{ role: 'user', content: val, timestamp: Date.now() }]);
    }
  }

  // Add history input to sync with global state
  @Input() set history(val: any[]) {
    if (val && val.length > 0) {
      const mapped = val.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Date.now() // Approximated
      }));
      // Only set if different or fresh session
      this.messages.set(mapped);
    } else if (val && val.length === 0) {
      this.messages.set([]);
    }
  }

  @Input() set nextResponse(resp: QAResponse | null) {
      if (resp) {
          // Check if we already have this response in history (avoid double add)
          this.messages.update(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.content === resp.answer_md) return prev;
              
              return [...prev, {
                  role: 'assistant',
                  content: resp.answer_md,
                  files: resp.used_files,
                  timestamp: Date.now()
              }];
          });
          this.isThinking.set(false);
      }
  }

  @Output() fileSelect = new EventEmitter<string>();
  @Output() goBack = new EventEmitter<void>();
  @Output() querySubmit = new EventEmitter<string>();
  @Output() newChat = new EventEmitter<void>();

  @ViewChild('scrollViewport') private scrollViewport!: ElementRef;
  
  messages = signal<ChatMessage[]>([]);
  isThinking = signal(false);
  currentInput = '';

  clearChat() {
    this.messages.set([]);
    this.newChat.emit();
  }

  onSend() {
    if (!this.currentInput.trim() || this.isThinking()) return;
    
    const text = this.currentInput.trim();
    this.messages.update(prev => [...prev, {
        role: 'user',
        content: text,
        timestamp: Date.now()
    }]);
    
    this.currentInput = '';
    this.isThinking.set(true);
    this.querySubmit.emit(text);
  }

  handleEnter(event: Event) {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
        e.preventDefault();
        this.onSend();
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollViewport.nativeElement.scrollTop = this.scrollViewport.nativeElement.scrollHeight;
    } catch (err) { }
  }

  getFileName(path: string): string {
    return path.split(/[\\\\/]/).pop() || path;
  }
}

