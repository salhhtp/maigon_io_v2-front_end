-- Create custom_solutions table
CREATE TABLE IF NOT EXISTS custom_solutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contract_type VARCHAR(100) NOT NULL,
  compliance_framework TEXT[] DEFAULT '{}',
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  custom_rules TEXT,
  analysis_depth VARCHAR(20) CHECK (analysis_depth IN ('basic', 'standard', 'comprehensive')) DEFAULT 'standard',
  report_format VARCHAR(20) CHECK (report_format IN ('summary', 'detailed', 'executive')) DEFAULT 'detailed',
  ai_model VARCHAR(50) DEFAULT 'openai-gpt-4',
  prompts JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_custom_solutions_created_by ON custom_solutions(created_by);
CREATE INDEX idx_custom_solutions_contract_type ON custom_solutions(contract_type);
CREATE INDEX idx_custom_solutions_is_public ON custom_solutions(is_public);
CREATE INDEX idx_custom_solutions_is_active ON custom_solutions(is_active);

-- Enable RLS
ALTER TABLE custom_solutions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own custom solutions" ON custom_solutions
  FOR SELECT USING (
    auth.uid() = created_by OR is_public = true
  );

CREATE POLICY "Users can create custom solutions" ON custom_solutions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own custom solutions" ON custom_solutions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own custom solutions" ON custom_solutions
  FOR DELETE USING (auth.uid() = created_by);

-- Admin access policy
CREATE POLICY "Admins can manage all custom solutions" ON custom_solutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add custom_solution_id to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS custom_solution_id UUID REFERENCES custom_solutions(id);

-- Add index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_contracts_custom_solution_id ON contracts(custom_solution_id);

-- Add custom_solution_id to contract_reviews table  
ALTER TABLE contract_reviews ADD COLUMN IF NOT EXISTS custom_solution_id UUID REFERENCES custom_solutions(id);
ALTER TABLE contract_reviews ADD COLUMN IF NOT EXISTS model_used VARCHAR(50);
ALTER TABLE contract_reviews ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_contract_reviews_custom_solution_id ON contract_reviews(custom_solution_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_model_used ON contract_reviews(model_used);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_custom_solutions_updated_at 
  BEFORE UPDATE ON custom_solutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create some default public custom solutions
INSERT INTO custom_solutions (
  name, 
  description, 
  contract_type, 
  compliance_framework, 
  risk_level,
  custom_rules,
  analysis_depth,
  report_format,
  ai_model,
  prompts,
  is_public,
  created_by
) VALUES 
(
  'GDPR Compliance Review',
  'Comprehensive GDPR compliance assessment for data processing agreements',
  'data-processing',
  ARRAY['gdpr', 'data-protection', 'privacy'],
  'high',
  'Focus on data subject rights, lawful basis for processing, data minimization, retention periods, and cross-border transfers. Evaluate compliance with GDPR Articles 6, 9, 13, 14, and Chapter V.',
  'comprehensive',
  'detailed',
  'openai-gpt-4',
  '{"systemPrompt": "You are a GDPR compliance expert specializing in data protection law and privacy regulations.", "analysisPrompt": "Conduct a comprehensive GDPR compliance assessment focusing on data subject rights, processing lawfulness, and regulatory requirements.", "compliancePrompt": "Evaluate compliance with GDPR articles and provide specific recommendations for any identified gaps."}',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Financial Risk Assessment',
  'Specialized financial risk analysis for commercial contracts',
  'commercial',
  ARRAY['financial-regulations', 'commercial-law'],
  'high',
  'Identify and assess financial risks including payment terms, penalties, currency exposure, credit risks, and financial covenants. Focus on cash flow impact and financial liability exposure.',
  'comprehensive',
  'detailed',
  'openai-gpt-4',
  '{"systemPrompt": "You are a financial risk analyst specializing in commercial contract analysis.", "analysisPrompt": "Analyze financial terms, payment structures, penalties, and overall financial risk exposure.", "riskPrompt": "Focus specifically on financial risks that could impact cash flow, profitability, or financial stability."}',
  true,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Employment Contract Review',
  'Comprehensive review for employment and HR-related agreements',
  'employment',
  ARRAY['employment-law', 'labor-law', 'hr-compliance'],
  'medium',
  'Review employment terms, compensation structures, confidentiality provisions, non-compete clauses, termination procedures, and compliance with labor laws.',
  'standard',
  'detailed',
  'openai-gpt-4',
  '{"systemPrompt": "You are an employment law specialist focusing on HR compliance and worker rights.", "analysisPrompt": "Review employment terms for legal compliance, fairness, and alignment with labor law requirements.", "compliancePrompt": "Ensure compliance with employment laws, wage and hour regulations, and worker protection statutes."}',
  true,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Update contracts and contract_reviews to include the new columns in any existing data
-- (This is safe to run multiple times)
COMMENT ON TABLE custom_solutions IS 'Stores custom AI analysis solutions created by users and admins';
COMMENT ON COLUMN custom_solutions.prompts IS 'JSON object containing AI prompts: systemPrompt, analysisPrompt, riskPrompt, compliancePrompt';
COMMENT ON COLUMN custom_solutions.compliance_framework IS 'Array of compliance frameworks this solution addresses';
COMMENT ON COLUMN custom_solutions.ai_model IS 'AI model to use for this custom solution';
