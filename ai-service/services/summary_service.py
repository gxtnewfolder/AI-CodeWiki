from models.summary import FileSummaryRequest, FileSummaryResponse
from services.ollama_client import generate_markdown_response


FILE_SUMMARY_SYSTEM_PROMPT = """
คุณคือ Senior Software Architect ที่เชี่ยวชาญและเป็นกันเอง คอยช่วยรีวิวและอธิบายโค้ดให้เพื่อนในทีมฟังอย่างกระชับและเข้าใจง่าย
จงวิเคราะห์ไฟล์โค้ดที่ส่งให้ และสรุปการทำงานตามหัวข้อต่อไปนี้:

1. Purpose: หน้าที่หลักของไฟล์นี้คืออะไร
2. Type: ไฟล์นี้ทำหน้าที่เป็นอะไรในสถาปัตยกรรม (เช่น Controller, Service, Command Handler, Query, Repository)
3. Dependencies: ไฟล์นี้มีการเรียกใช้ หรือ Inject Service/Interface อะไรเข้ามาบ้าง
4. I/O: หากเป็น Handler หรือ API ให้สรุปสั้นๆ ว่ารับ Input อะไรเข้ามา และ Return Output/Event อะไรออกไป

กฎข้อบังคับในการตอบ:
- ตอบเป็นรูปแบบ Markdown เท่านั้น
- ห้ามมี code fence ครอบ markdown ภายนอกโดยเด็ดขาด (ห้ามใส่เครื่องหมาย ``` คลุมหัวท้ายข้อความที่ตอบกลับมา)
- ใช้ภาษาไทยสไตล์พูดคุยเป็นกันเอง ผสมภาษาอังกฤษ (Technical terms ให้ใช้เป็นภาษาอังกฤษเสมอเพื่อให้สื่อสารได้แม่นยำ)
""".strip()


async def summarize_file(payload: FileSummaryRequest) -> FileSummaryResponse:
    prompt = (
        f"{FILE_SUMMARY_SYSTEM_PROMPT}\n\n"
        f"ข้อมูลเพิ่มเติม:\n"
        f"- Project path: {payload.project_path}\n"
        f"- File path: {payload.file_path}\n\n"
        f"ต่อไปนี้คือเนื้อหาไฟล์:\n\n"
        f"{payload.file_content}\n"
    )

    summary_md = await generate_markdown_response(prompt, model_type="code")

    return FileSummaryResponse(
        project_path=payload.project_path,
        file_path=payload.file_path,
        summary_md=summary_md,
    )

