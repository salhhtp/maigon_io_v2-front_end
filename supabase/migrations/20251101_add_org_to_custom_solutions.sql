-- Add organization association to custom solutions
ALTER TABLE custom_solutions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_custom_solutions_organization_id
  ON custom_solutions(organization_id);

-- Refresh row level security policies to account for organization scoped access
DROP POLICY IF EXISTS "Users can view their own custom solutions" ON custom_solutions;
DROP POLICY IF EXISTS "Users can create custom solutions" ON custom_solutions;
DROP POLICY IF EXISTS "Users can update their own custom solutions" ON custom_solutions;
DROP POLICY IF EXISTS "Users can delete their own custom solutions" ON custom_solutions;
DROP POLICY IF EXISTS "Admins can manage all custom solutions" ON custom_solutions;

CREATE POLICY "custom_solutions_select" ON custom_solutions
  FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = created_by
    OR (
      organization_id IS NOT NULL
      AND organization_id = (
        SELECT organization_id
        FROM user_profiles
        WHERE auth_user_id = auth.uid()
        LIMIT 1
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "custom_solutions_insert" ON custom_solutions
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE auth_user_id = auth.uid() AND role = 'admin'
      )
      OR (
        organization_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE auth_user_id = auth.uid()
            AND organization_role = 'org_admin'
            AND organization_id = custom_solutions.organization_id
        )
      )
    )
  );

CREATE POLICY "custom_solutions_update" ON custom_solutions
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE auth_user_id = auth.uid()
          AND organization_role = 'org_admin'
          AND organization_id = custom_solutions.organization_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE auth_user_id = auth.uid()
          AND organization_role = 'org_admin'
          AND organization_id = custom_solutions.organization_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "custom_solutions_delete" ON custom_solutions
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE auth_user_id = auth.uid()
          AND organization_role = 'org_admin'
          AND organization_id = custom_solutions.organization_id
      )
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
