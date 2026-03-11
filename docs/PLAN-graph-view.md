# 🌌 Feature Plan: Interactive Graph View (แผนที่โค้ดแบบมองเห็นได้)

## 1. Feature Overview (ภาพรวมฟีเจอร์)
ระบบแสดงผลความสัมพันธ์ของไฟล์และสถาปัตยกรรมโค้ด (Dependencies, Imports, Injections) ในรูปแบบ Interactive Graph (Node & Edge) บนหน้าจอ Frontend โดยดึงข้อมูลโครงสร้างมาจาก Graph Database (Neo4j) เพื่อให้ผู้ใช้สามารถซูม, แพน, และคลิกดูความเชื่อมโยงของระบบได้แบบเห็นภาพรวม (Visual Representation)

## 2. Tech Stack Additions (เครื่องมือที่ต้องใช้เพิ่ม)
* **Frontend (Angular):** * แนะนำไลบรารี **`vis-network`** (ผูกกับ Angular) หรือ **`ngx-graph`** เพราะรองรับการทำ Interactive (Zoom, Pan, Drag) และจัดการ Node จำนวนมากได้ลื่นไหล
* **AI Microservice (Python):** * ใช้ `neo4j` Python Driver ในการ Query ดึงข้อมูล Sub-graph ออกมาแปลงเป็น JSON Format ที่ Frontend เข้าใจง่าย
* **Backend Agent (Go):** * ทำหน้าที่เป็น Proxy API (Pass-through) ส่งผ่านข้อมูล JSON ระหว่าง Python และ Angular

## 3. Architecture & Data Flow (ลำดับการทำงาน)
1. **User Action:** ผู้ใช้กดปุ่ม "View Graph" ที่ไฟล์เป้าหมาย (เช่น `OrderService`) บนหน้า Angular
2. **Go Proxy:** Angular ยิง API `GET /api/v1/graph?file=OrderService` ไปที่ Go Backend 
3. **Graph Query:** Go ส่ง Request ต่อไปที่ Python Microservice
4. **Data Extraction:** Python รันคำสั่ง **Cypher Query** บน Neo4j เพื่อดึง Node (ไฟล์เป้าหมายและไฟล์ที่เกี่ยวข้องในระยะ 1-2 Hops) และ Edge (เส้นความสัมพันธ์ เช่น `CALLS`, `IMPORTS`)
5. **Format Conversion:** Python แปลงผลลัพธ์จาก Neo4j ให้อยู่ในฟอร์แมต JSON มาตรฐาน:
   ```json
   {
     "nodes": [
       {"id": "1", "label": "OrderService", "group": "service"},
       {"id": "2", "label": "OrderRepository", "group": "repository"}
     ],
     "edges": [
       {"from": "1", "to": "2", "label": "injects"}
     ]
   }