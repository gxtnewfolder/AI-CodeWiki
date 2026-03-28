# Force reload
from typing import List

import httpx

from config import settings
from neo4j import GraphDatabase
from models.impact import (
    ImpactAnalysisRequest,
    ImpactAnalysisResponse,
    ImpactNode,
    ImpactEdge,
    ProjectGraphSyncRequest,
)
from services.ollama_client import generate_markdown_response

class Neo4jService:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.graph_db_url,
            auth=(settings.graph_db_user, settings.graph_db_password)
        )

    def close(self):
        self.driver.close()

    def query(self, cypher: str, parameters: dict = None):
        with self.driver.session() as session:
            return session.run(cypher, parameters).data()

graph_db = Neo4jService()


IMPACT_SYSTEM_PROMPT = """
คุณคือ Senior Software Architect ที่ช่วยวิเคราะห์ Dependency / Impact ของการแก้ไขโค้ดในโปรเจกต์

กติกา:
- จะได้รับข้อมูล node/edge จาก dependency graph (ถ้ามี)
- ช่วยสรุปว่า ถ้าแตะไฟล์/จุดนี้ จะกระทบอะไรบ้าง และควรระวังตรงไหน
- ตอบเป็น Markdown ภาษาไทยผสมอังกฤษ
- ห้ามมี code fence ครอบ markdown ภายนอก (ห้ามใช้ ``` ครอบทั้งคำตอบ)
""".strip()


async def sync_graph(project_path: str, file_path: str):
    """
    Sync backend dependency data for a file into Neo4j.
    """
    url = settings.backend_endpoint("/api/v1/deps")
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            json={"project_path": project_path, "file_path": file_path},
        )
    
    if resp.status_code != 200:
        return

    data = resp.json()
    center_path = data.get("file_path", file_path)
    
    # Merge center node
    graph_db.query(
        "MERGE (f:File {path: $path}) SET f.indexed_at = datetime()",
        {"path": center_path}
    )
    
    # Process imports
    for imp in data.get("imports", []) or []:
        dep_path = imp.get("file_path")
        if not dep_path: continue
        
        graph_db.query(
            """
            MERGE (c:File {path: $center})
            MERGE (d:File {path: $dep})
            MERGE (c)-[r:IMPORTS]->(d)
            SET r.symbol = $symbol, r.line = $line
            """,
            {"center": center_path, "dep": dep_path, "symbol": imp.get("symbol"), "line": imp.get("line")}
        )

    # Process imported_by
    for rev in data.get("imported_by", []) or []:
        dep_path = rev.get("file_path")
        if not dep_path: continue
        
        graph_db.query(
            """
            MERGE (c:File {path: $center})
            MERGE (d:File {path: $rev})
            MERGE (d)-[r:IMPORTS]->(c)
            SET r.symbol = $symbol, r.line = $line
            """,
            {"center": center_path, "rev": dep_path, "symbol": rev.get("symbol"), "line": rev.get("line")}
        )

async def _query_dependency_graph(request: ImpactAnalysisRequest) -> tuple[list[ImpactNode], list[ImpactEdge]]:
    """
    RAG Phase 2: Query Neo4j for 2-hop impact analysis.
    """
    cypher = """
    MATCH (f:File {path: $path})
    OPTIONAL MATCH (f)-[r:IMPORTS*1..2]-(connected:File)
    RETURN f, collect(DISTINCT connected) as connections, collect(DISTINCT r) as rels
    """
    results = graph_db.query(cypher, {"path": request.file_path})
    
    if not results or not results[0]['f']:
        # Fallback to backend sync if Neo4j is empty for this file
        await sync_graph(request.project_path, request.file_path)
        # Re-query
        results = graph_db.query(cypher, {"path": request.file_path})

    nodes_by_id: dict[str, ImpactNode] = {}
    edges: list[ImpactEdge] = []

    if results and results[0]['f']:
        f = results[0]['f']
        nodes_by_id[f['path']] = ImpactNode(id=f['path'], label="file", file_path=f['path'])
        
        for conn in results[0]['connections']:
            nodes_by_id[conn['path']] = ImpactNode(id=conn['path'], label="file", file_path=conn['path'])
            # Basic edge creation from 1..2 hops (simplified for UI)
            edges.append(ImpactEdge(source=f['path'], target=conn['path'], relation="impact"))

    return list(nodes_by_id.values()), edges


async def analyze_impact(request: ImpactAnalysisRequest) -> ImpactAnalysisResponse:
    nodes, edges = await _query_dependency_graph(request)

    graph_text_parts: List[str] = []
    if nodes:
        graph_text_parts.append("Nodes:")
        for node in nodes:
            graph_text_parts.append(f"- {node.id} ({node.label}) file={node.file_path}")
    if edges:
        graph_text_parts.append("Edges:")
        for edge in edges:
            graph_text_parts.append(
                f"- {edge.source} -[{edge.relation}]-> {edge.target}"
            )

    graph_text = "\n".join(graph_text_parts) if graph_text_parts else "ยังไม่มีข้อมูลจาก Graph DB (Neo4j)."

    user_question = request.question or "วิเคราะห์ impact ของไฟล์นี้ในภาพรวม"

    prompt = (
        f"{IMPACT_SYSTEM_PROMPT}\n\n"
        f"Project path: {request.project_path}\n"
        f"File path ที่สนใจ: {request.file_path}\n\n"
        f"คำถามจากผู้ใช้: {user_question}\n\n"
        f"ข้อมูลจาก dependency graph:\n{graph_text}\n"
    )

    analysis_md = await generate_markdown_response(
        prompt, 
        model_type="general", 
        model_name=request.model,
        provider=request.provider,
        api_key=request.api_key
    )

    return ImpactAnalysisResponse(
        analysis_md=analysis_md,
        nodes=nodes,
        edges=edges,
    )


async def sync_project_dependencies(request: ProjectGraphSyncRequest):
    """
    Sync all dependencies for a whole project at once.
    """
    print(f"Full Graph Sync for project: {request.project_path} ({len(request.analysis)} files)")
    
    for res in request.analysis:
        center_path = res.file_path
        
        # Merge center node
        graph_db.query(
            "MERGE (f:File {path: $path}) SET f.indexed_at = datetime(), f.language = $lang",
            {"path": center_path, "lang": res.language}
        )
        
        # Merge imports
        for imp in res.imports:
            dep_path = imp.file_path
            if not dep_path: continue
            
            graph_db.query(
                """
                MERGE (c:File {path: $center})
                MERGE (d:File {path: $dep})
                MERGE (c)-[r:IMPORTS]->(d)
                SET r.symbol = $symbol, r.line = $line
                """,
                {"center": center_path, "dep": dep_path, "symbol": imp.symbol, "line": imp.line}
            )
            
    print(f"Graph Sync Complete for {request.project_path}")

