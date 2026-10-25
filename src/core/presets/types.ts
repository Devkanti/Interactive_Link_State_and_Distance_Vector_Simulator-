import { GraphSnapshot } from '../types';

export interface PresetTopology {
  id: string;
  name: string;
  category: 'academic' | 'benchmark' | 'historical' | 'generator';
  description: string;
  badge?: string;
  tags: string[];
  recommendedAlgorithm?: 'LSR' | 'DVR' | 'BOTH';
  generateSnapshot: () => GraphSnapshot;
}
