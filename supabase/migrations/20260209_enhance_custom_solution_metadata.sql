-- Enrich custom solution metadata to support playbook and drafting configuration
ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS section_layout JSONB DEFAULT '[]';

ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS clause_library JSONB DEFAULT '[]';

ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS deviation_rules JSONB DEFAULT '[]';

ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS similarity_benchmarks JSONB DEFAULT '[]';

ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS model_settings JSONB DEFAULT '{}'::jsonb;

ALTER TABLE custom_solutions
  ADD COLUMN IF NOT EXISTS drafting_settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN custom_solutions.section_layout IS 'Ordered section configuration used to render Maigon-style reviews';
COMMENT ON COLUMN custom_solutions.clause_library IS 'List of canonical clause templates and expectations for this solution';
COMMENT ON COLUMN custom_solutions.deviation_rules IS 'Playbook deviation rules to flag when analysis diverges from expectations';
COMMENT ON COLUMN custom_solutions.similarity_benchmarks IS 'Benchmark references used for similarity comparisons';
COMMENT ON COLUMN custom_solutions.model_settings IS 'JSON object with reasoning/classification model overrides';
COMMENT ON COLUMN custom_solutions.drafting_settings IS 'JSON object controlling AI draft preview/export behaviour';
