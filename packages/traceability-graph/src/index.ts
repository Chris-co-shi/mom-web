export interface GenealogyNode {
  id: string;
  batchNo: string;
  materialCode: string;
  materialName: string;
  nodeType: 'raw-material' | 'intermediate' | 'finished-good';
}

export interface GenealogyEdge {
  source: string;
  target: string;
  quantity: number;
  unit: string;
  operationType: 'consume' | 'produce' | 'split' | 'merge' | 'rework' | 'downgrade';
}

export interface GenealogyGraph {
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
}
