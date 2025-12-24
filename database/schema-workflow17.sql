-- ============================================
-- WORKFLOW 17: User Signature Creation & Management
-- Bảng bổ sung - KHÔNG ảnh hưởng schema hiện tại
-- ============================================

-- Lưu ý: Bảng user_signatures đã tồn tại trong schema.sql gốc
-- File này chỉ tạo bảng mới user_signature_images để lưu ảnh chữ ký

-- Bảng lưu ảnh chữ ký của user (bổ sung cho user_signatures)
CREATE TABLE IF NOT EXISTS user_signature_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'uploaded', 'typed')),
  image_storage_path TEXT NOT NULL,
  image_url TEXT,
  thumbnail_path TEXT,
  is_default BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_sig_images_user ON user_signature_images(user_id);
-- Partial unique index: chỉ cho phép 1 default signature mỗi user
CREATE UNIQUE INDEX IF NOT EXISTS idx_sig_images_one_default 
  ON user_signature_images(user_id) 
  WHERE is_default = true;

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION update_user_signature_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_signature_images_updated_at
  BEFORE UPDATE ON user_signature_images
  FOR EACH ROW
  EXECUTE FUNCTION update_user_signature_images_updated_at();

-- RLS Policies
ALTER TABLE user_signature_images ENABLE ROW LEVEL SECURITY;

-- User chỉ xem được chữ ký của mình
CREATE POLICY "Users can view own signature images" ON user_signature_images
  FOR SELECT USING (user_id = auth.uid());

-- User chỉ tạo chữ ký cho mình
CREATE POLICY "Users can insert own signature images" ON user_signature_images
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- User chỉ update chữ ký của mình
CREATE POLICY "Users can update own signature images" ON user_signature_images
  FOR UPDATE USING (user_id = auth.uid());

-- User chỉ delete chữ ký của mình
CREATE POLICY "Users can delete own signature images" ON user_signature_images
  FOR DELETE USING (user_id = auth.uid());

-- Grant cho service role
GRANT ALL ON user_signature_images TO service_role;
