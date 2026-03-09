# System Specification: AI-Powered Code Wiki

## 1. Project Overview
แอปพลิเคชันสำหรับนักพัฒนา เพื่อใช้อ่านและทำความเข้าใจโครงสร้างโปรเจกต์ (Source Code) ในเครื่อง Local หรือบน VM โดยทำงานเสมือน IDE (เช่น VS Code) แต่เพิ่มความสามารถในการนำ AI มาช่วยสรุปการทำงานของไฟล์นั้นๆ (เช่น Service, Command, Handler, Query) ในรูปแบบ Markdown พร้อมระบบ Caching เพื่อประหยัด Token ในกรณีที่ไฟล์ไม่ได้ถูกแก้ไข

## 2. System Architecture
ระบบแบ่งออกเป็น 2 ส่วนหลัก ทำงานแยกกันชัดเจน:
* **Frontend (UI):** `Angular` รับหน้าที่แสดงผล File Tree, Markdown Renderer และจัดการ State ต่างๆ ของผู้ใช้
* **Backend (Local Agent):** `Go (Golang)` ทำหน้าที่เป็น Local Web Server สแกนไฟล์, คำนวณ Hash, จัดการฐานข้อมูล Local และเป็นตัวกลางเชื่อมต่อ AI API
* **Database:** `SQLite` เก็บข้อมูล Cache (File Hash & Markdown Summary) เพื่อลดการเรียกใช้ AI ซ้ำซ้อน
* **Analytics (Optional):** `PostHog` สำหรับเก็บสถิติพฤติกรรมการเรียกดูไฟล์ (เช่น ดู Handler หรือ Service บ่อยแค่ไหน)
* **UI/UX Design Tool:** `Refero MCP` สำหรับให้ AI Coding Agent (เช่น Cursor, Claude) ดึง Reference โครงสร้าง UI ระดับโลกมาใช้เป็นต้นแบบในการสร้าง Frontend Components

## 3. Functional Requirements

### 3.1 Backend (Go Agent)
* **F-B1 (Directory Scanner):** สามารถรับ Path ของโปรเจกต์ และสแกนโครงสร้าง Folder/File ทั้งหมด คืนค่ากลับมาเป็น JSON Tree
* **F-B2 (File Hashing):** สามารถอ่านเนื้อหาไฟล์และสร้าง SHA-256 Hash เพื่อใช้ตรวจสอบการเปลี่ยนแปลงของไฟล์ได้
* **F-B3 (Caching System):** สามารถบันทึกและดึงข้อมูลสรุป (Markdown) จาก SQLite โดยอ้างอิงจาก File Path และ Hash ได้
* **F-B4 (AI Integration):** สามารถส่งเนื้อหาโค้ดพร้อม System Prompt ไปยัง LLM API (เช่น Gemini) และรับผลลัพธ์กลับมาได้

### 3.2 Frontend (Angular)
* **F-F1 (IDE-like Layout):** มี Sidebar แสดง File Tree กาง/หุบได้ และ Main Panel สำหรับแสดงผลข้อมูล (อ้างอิงดีไซน์ผ่าน Refero MCP)
* **F-F2 (On-Demand Summary):** ผู้ใช้สามารถคลิกเลือกไฟล์ใน File Tree เพื่อส่งคำขอให้ Backend สรุปไฟล์นั้นๆ ได้ (ไม่สรุปอัตโนมัติ เพื่อประหยัด Token)
* **F-F3 (Markdown Rendering):** สามารถเรนเดอร์ข้อความ Markdown ที่ได้จาก Backend ให้สวยงาม รองรับ Syntax Highlighting
* **F-F4 (Analytics Tracking):** ส่ง Event ไปยัง PostHog เมื่อมีการร้องขอ AI Summary สำเร็จ

## 4. Database Schema Design (SQLite)
ตารางหลักสำหรับทำ Caching (`file_summaries`)

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | รหัสอ้างอิง |
| `project_path` | TEXT | NOT NULL | Path เริ่มต้นของโปรเจกต์ (เช่น `/users/dev/pos-system`) |
| `file_path` | TEXT | NOT NULL, UNIQUE | Path ย่อยของไฟล์ (เช่น `/src/handlers/create-order.ts`) |
| `file_hash` | TEXT | NOT NULL | SHA-256 Hash ของเนื้อหาไฟล์ล่าสุด |
| `summary_md`| TEXT | NOT NULL | ข้อความ Markdown ที่ AI สรุปมาให้ |
| `updated_at`| DATETIME| DEFAULT CURRENT_TIMESTAMP | เวลาที่ AI สรุปเนื้อหานี้ล่าสุด |

## 5. API Specification (RESTful)

### 5.1 Get Project Tree
* **Method:** `GET`
* **Endpoint:** `/api/v1/tree`
* **Query Params:** `?path=/path/to/your/project`
* **Response:** JSON Object โครงสร้าง Folder/File

### 5.2 Get/Generate File Summary
* **Method:** `POST`
* **Endpoint:** `/api/v1/summary`
* **Payload:**
    ```json
    {
      "project_path": "/path/to/your/project",
      "file_path": "/src/handlers/create-order.ts"
    }
    ```
* **Process Flow:**
    1. อ่านไฟล์ตาม `file_path` -> 2. คำนวณ SHA-256 -> 3. เช็ค Hash ในตาราง `file_summaries` -> 4a. ถ้า Cache Hit คืนค่า Markdown -> 4b. ถ้า Cache Miss ยิง AI API, บันทึก DB, คืนค่า Markdown

## 6. AI Prompt Design Strategy
**System Prompt Template (For Backend Agent):**
"คุณคือ Senior Software Architect จงวิเคราะห์ไฟล์โค้ดที่ส่งให้ และสรุปการทำงานเป็น Markdown ตามหัวข้อต่อไปนี้:
1. **Purpose:** หน้าที่หลักของไฟล์นี้คืออะไร
2. **Type:** ไฟล์นี้ทำหน้าที่เป็นอะไรในสถาปัตยกรรม (เช่น Controller, Service, Command Handler, Query, Repository)
3. **Dependencies:** ไฟล์นี้มีการเรียกใช้ หรือ Inject Service/Interface อะไรเข้ามาบ้าง
4. **I/O:** หากเป็น Handler หรือ API ให้สรุปสั้นๆ ว่ารับ Input อะไร และ Return Output/Event อะไรออกไป"

## 7. UI/UX Development Strategy (Refero MCP Integration)
ในการพัฒนาฝั่ง Frontend (Angular) ให้ AI Agent ที่ทำหน้าที่เขียนโค้ด ใช้ **Refero MCP** เป็น Context ในการออกแบบหน้าจอ โดยมีแนวทางดังนี้:
* **Layout Reference:** ใช้ Refero ค้นหา User Flow และ Layout ของแอปพลิเคชันประเภท Code Editor หรือ Documentation Platform (เช่น VS Code, Notion, Linear)
* **Component Design:** เมื่อสร้าง Component เช่น Sidebar (File Tree) หรือ Empty State (ตอนที่ยังไม่ได้เลือกไฟล์) ให้ดึง Best Practice จาก Refero มาใช้เขียนโครงสร้าง HTML/CSS
* **Target Outcome:** มุ่งเน้นการจัดวาง (Spacing), การใช้สี (Color Theme แบบ Dark/Light mode), และ Typography ที่อ่านง่ายเหมาะสำหรับนักพัฒนา