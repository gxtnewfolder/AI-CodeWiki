package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type OllamaProvider struct {
	BaseURL string // e.g. "http://localhost:11434"
}

func (o *OllamaProvider) Name() string { return "ollama" }

func (o *OllamaProvider) baseURL() string {
	if o.BaseURL == "" {
		return "http://localhost:11434"
	}
	return o.BaseURL
}

func (o *OllamaProvider) Summarize(ctx context.Context, code string, prompt string) (string, error) {
	if prompt == "" {
		prompt = DefaultSystemPrompt
	}

	body := map[string]interface{}{
		// ใช้ qwen2.5-coder:7b เป็นค่าเริ่มต้น ตาม docs/spec-llm.md
		"model": "qwen2.5-coder:7b",
		"messages": []map[string]string{
			{"role": "system", "content": prompt},
			{"role": "user", "content": code},
		},
		"stream": false,
		"options": map[string]interface{}{
			"temperature":  0.3,
			"num_predict":  4096,
		},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	url := o.baseURL() + "/api/chat"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama API error (%d): %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	return result.Message.Content, nil
}

func (o *OllamaProvider) ValidateKey(ctx context.Context, key string) error {
	baseURL := key
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}

	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+"/api/tags", nil)
	if err != nil {
		return err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cannot connect to Ollama at %s: %w", baseURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("ollama not responding (status %d)", resp.StatusCode)
	}
	return nil
}
