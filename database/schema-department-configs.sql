-- ============================================
-- DEPARTMENT CONFIGS TABLE
-- Lưu cấu hình email phòng ban cho từng user
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Department Configs table
CREATE TABLE IF NOT EXISTS department_configs (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  category_key TEXT NOT NULL,
  department_name TEXT NOT NULL,
  notification_email TEXT
);

-- Tạo unique constraint riêng (để upsert hoạt động)
-- Nếu đã có constraint thì bỏ qua
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'department_configs_owner_category_unique'
  ) THEN
    ALTER TABLE department_configs 
    ADD CONSTRAINT department_configs_owner_category_unique 
    UNIQUE (owner_id, category_key);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_department_configs_owner ON department_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_department_configs_category ON department_configs(category_key);

-- Enable RLS
ALTER TABLE department_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own department configs
CREATE POLICY "Users can view own department configs" ON department_configs
  FOR SELECT USING (auth.uid() = owner_id);

-- Users can insert their own department configs
CREATE POLICY "Users can insert own department configs" ON department_configs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update their own department configs
CREATE POLICY "Users can update own department configs" ON department_configs
  FOR UPDATE USING (auth.uid() = owner_id);

-- Users can delete their own department configs
CREATE POLICY "Users can delete own department configs" ON department_configs
  FOR DELETE USING (auth.uid() = owner_id);

-- Grant to service role (for backend/n8n)
GRANT ALL ON department_configs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE department_configs_id_seq TO service_role;

-- ============================================
-- Default departments reference (7 phòng ban)
-- ============================================
-- 1. Finance & Tax -> Phòng Tài chính - Kế toán
-- 2. Legal & Contracts -> Phòng Pháp chế
-- 3. HR & Admin -> Phòng Hành chính - Nhân sự
-- 4. Sales & CRM -> Phòng Kinh doanh
-- 5. Projects & Tech -> Phòng Kỹ thuật & Dự án
-- 6. Marketing -> Phòng Marketing
-- 7. Other -> Bộ phận Quản lý chung
