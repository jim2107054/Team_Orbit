import { Router, Request, Response } from 'express';
import { scamKnowledgeGraph } from '../../services/scam-knowledge-graph.js';
import { copilotService } from '../../services/copilot-service.js';

export const knowledgeGraphRouter = Router();

// ================= BANGLADESH SCAM KNOWLEDGE GRAPH ROUTES =================
knowledgeGraphRouter.get('/knowledge-graph/subgraph', (req: Request, res: Response) => {
  try {
    const { center_node_id, depth, entity_types, start_time, end_time, suspicious_only, min_confidence, limit } = req.query;
    
    let parsedTypes: any = undefined;
    if (entity_types) {
      if (Array.isArray(entity_types)) {
        parsedTypes = entity_types;
      } else if (typeof entity_types === 'string') {
        parsedTypes = (entity_types as string).split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const sub = scamKnowledgeGraph.getSubGraph({
      center_node_id: center_node_id ? String(center_node_id) : undefined,
      depth: depth ? parseInt(String(depth), 10) : 1,
      entity_types: parsedTypes,
      start_time: start_time ? String(start_time) : undefined,
      end_time: end_time ? String(end_time) : undefined,
      suspicious_only: suspicious_only === 'true',
      min_confidence: min_confidence ? parseFloat(String(min_confidence)) : 0.0,
      limit: limit ? parseInt(String(limit), 10) : 60
    });

    return res.status(200).json({
      success: true,
      message: `Knowledge subgraph retrieved with ${sub.nodes.length} nodes and ${sub.edges.length} edges`,
      subgraph: sub
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graph subgraph',
      error: { code: 'SUBGRAPH_ERROR', details: err.message }
    });
  }
});

knowledgeGraphRouter.get('/knowledge-graph/nodes', (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;
    let nodes = scamKnowledgeGraph.getAllNodes();

    if (type) {
      nodes = nodes.filter(n => n.type === String(type));
    }
    if (q) {
      const qStr = String(q).toLowerCase();
      nodes = nodes.filter(n => n.id.toLowerCase().includes(qStr) || n.label.toLowerCase().includes(qStr) || (n.label_bn && n.label_bn.includes(qStr)));
    }

    return res.status(200).json({
      success: true,
      message: `Retrieved ${nodes.length} knowledge graph entities`,
      count: nodes.length,
      nodes
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve knowledge graph entities',
      error: { code: 'NODES_FETCH_ERROR', details: err.message }
    });
  }
});

knowledgeGraphRouter.get('/knowledge-graph/nodes/:id', (req: Request, res: Response) => {
  try {
    const node = scamKnowledgeGraph.getNode(req.params.id);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Knowledge node not found',
        error: { code: 'NOT_FOUND' }
      });
    }
    const sub = scamKnowledgeGraph.getSubGraph({ center_node_id: req.params.id, depth: 1 });
    return res.status(200).json({
      success: true,
      message: `Knowledge entity ${req.params.id} details and 1-hop neighborhood retrieved`,
      node,
      connections: sub
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve node details',
      error: { code: 'NODE_DETAILS_ERROR', details: err.message }
    });
  }
});

knowledgeGraphRouter.post('/knowledge-graph/query', (req: Request, res: Response) => {
  try {
    const { query, language } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = scamKnowledgeGraph.queryGraph(query, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Knowledge graph natural language query completed',
      result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to query knowledge graph',
      error: { code: 'QUERY_ERROR', details: err.message }
    });
  }
});

knowledgeGraphRouter.get('/knowledge-graph/evidence-pack/:id', (req: Request, res: Response) => {
  try {
    const pack = scamKnowledgeGraph.generateCopilotEvidencePack(req.params.id);
    return res.status(200).json({
      success: true,
      message: `Evidence pack generated for entity ${req.params.id}`,
      evidence_pack: pack
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate evidence pack',
      error: { code: 'PACK_ERROR', details: err.message }
    });
  }
});

knowledgeGraphRouter.post('/copilot/knowledge-query', (req: Request, res: Response) => {
  try {
    const { question, language } = req.body;
    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question parameter is required',
        error: { code: 'INVALID_PAYLOAD' }
      });
    }

    const result = copilotService.queryKnowledgeCopilot(question, language || 'en');
    return res.status(200).json({
      success: true,
      message: 'Copilot knowledge question answered',
      ...result
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: 'Knowledge Copilot query failed',
      error: { code: 'COPILOT_ERROR', details: err.message }
    });
  }
});
