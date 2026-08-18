-- Security: Add hierarchy level constraints to custom_roles table

-- Add CHECK constraint to ensure hierarchy_level is within valid range (0-99)
ALTER TABLE identity.custom_roles 
ADD CONSTRAINT check_hierarchy_level_range 
CHECK (hierarchy_level >= 0 AND hierarchy_level <= 99);

-- Add unique index to ensure only one Super Admin (hierarchy 0) per company for system roles
-- This prevents multiple Super Admins which could be a security risk
CREATE UNIQUE INDEX idx_one_super_admin_per_company 
ON identity.custom_roles (company_id) 
WHERE hierarchy_level = 0 AND is_system_role = true;

-- Add index on (company_id, hierarchy_level) for better query performance
CREATE INDEX idx_custom_roles_company_hierarchy 
ON identity.custom_roles (company_id, hierarchy_level);

-- Add comment for documentation
COMMENT ON CONSTRAINT check_hierarchy_level_range ON identity.custom_roles IS 
'Ensures hierarchy_level is between 0 (Super Admin) and 99 (lowest privilege)';
