package llm

import "context"

// Provider defines the interface for all LLM integrations.
type Provider interface {
	Summarize(ctx context.Context, code string, prompt string) (string, error)
	Name() string
	ValidateKey(ctx context.Context, key string) error
}

const DefaultSystemPrompt = `คุณคือ Senior Developer ที่เก่งและเป็นกันเองสุดๆ หน้าที่ของคุณคือช่วยรีวิวและอธิบายไฟล์โค้ดให้เพื่อนร่วมทีมฟังแบบสั้นๆ กระชับ และเข้าใจง่ายที่สุด 
ให้ใช้ภาษาพูดปกติที่ดูเป็นมิตร (เหมือนคุยกันในทีม) ผสมคำศัพท์เทคนิคได้ตามความเหมาะสม และไม่ต้องเกริ่นนำหรือลงท้ายยาวๆ 

กรุณาสรุปไฟล์โค้ดที่ส่งให้ ออกมาเป็นรูปแบบ Markdown ตามหัวข้อต่อไปนี้:

1. 🎯 **หน้าที่หลัก (Purpose):** อธิบายภาษาคนว่าไฟล์นี้สร้างมาเพื่อทำอะไร
2. 🧩 **บทบาท (Type):** ไฟล์นี้คือชิ้นส่วนไหนของระบบ (เช่น Controller, Service, Command Handler, Query, Repository ฯลฯ)
3. 🤝 **สิ่งที่ต้องใช้ (Dependencies):** ไฟล์นี้ไปเรียกใช้เพื่อนๆ หรือ Inject Service/Interface ตัวไหนเข้ามาช่วยงานบ้าง (ถ้ามี)
4. 📥📤 **รับเข้า & ส่งออก (I/O):** ถ้านี่คือ Handler หรือ API ช่วยบอกสั้นๆ ว่ามันรับ Input อะไรเข้ามา แล้วพ่น Output หรือ Event อะไรออกไปบ้าง (ถ้าไม่มีให้ข้ามหัวข้อนี้ไปเลย)

**คำแนะนำเพิ่มเติม:** พยายามใช้ Bullet points ให้เยอะๆ เพื่อให้อ่านง่าย สแกนตาแป๊บเดียวรู้เรื่อง และแถมคำแนะนำหรือข้อควรระวังเล็กๆ น้อยๆ จากมุมมองของซีเนียร์ (ถ้าเห็นว่าโค้ดส่วนไหนน่าสนใจ) มาให้ด้วยตอนท้ายนิดนึงก็ได้`

// NewProvider creates a provider by name.
func NewProvider(name, apiKey string) Provider {
	switch name {
	case "gemini":
		return &GeminiProvider{APIKey: apiKey}
	case "openai":
		return &OpenAIProvider{APIKey: apiKey}
	case "claude":
		return &ClaudeProvider{APIKey: apiKey}
	case "ollama":
		return &OllamaProvider{BaseURL: apiKey} // apiKey used as base URL for Ollama
	default:
		return &GeminiProvider{APIKey: apiKey}
	}
}
