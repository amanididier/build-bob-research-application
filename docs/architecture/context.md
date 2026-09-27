# Context Assembly Engine

## Candidate-Based Relevance Retrieval
Instead of rigid static token quotas, the context engine creates `ContextCandidate` records across:
1. User memory facts
2. Parent research findings
3. Cross-research discoveries from the knowledge graph
4. Saved highlights and quotes
5. Active research goals

Candidates are scored using composite relevance (`relevanceScore * 2 + importance * 1.5`), sorted, and injected up to a strict maximum token ceiling (<6,000 tokens), preserving response space for the AI model.
