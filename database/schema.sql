-- ============================================
-- E-SIGNATURE MODULE - DATABASE SCHEMA
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- 1. Documents table (dùng chung cho nhiều flows)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'classified', 'signed', 'archived', 'deleted')),
  sensitivity_level TEXT DEFAULT 'unknown',
  gdpr_flags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  update_at TIMESTAMPTZ DEFAULT now()
);

-- Index cho documents
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- 2. User Signatures table (chữ ký nội bộ của user)
CREATE TABLE IF NOT EXISTS user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  pin_hash TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- Unique constraint: chỉ 1 active signature per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_signatures_active 
ON user_signatures(user_id) 
WHERE revoked_at IS NULL;

-- 3. Document Signatures table (chữ ký thực tế trên document)
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_hash TEXT NOT NULL,
  signature_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  meta JSONB
);

-- Indexes cho document_signatures
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_user ON document_signatures(user_id);

-- 4. Signature Requests table (yêu cầu ký)
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'declined', 'expired', 'cancelled')),
  message TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes cho signature_requests
CREATE INDEX IF NOT EXISTS idx_signature_requests_document ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_creator ON signature_requests(creator_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);

-- 5. Signature Request Signers table (danh sách người ký trong request)
CREATE TABLE IF NOT EXISTS signature_request_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signer_email TEXT NOT NULL,
  signer_name TEXT,
  order_index INT DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired', 'cancelled')),
  signed_at TIMESTAMPTZ,
  signature_id UUID REFERENCES document_signatures(id) ON DELETE SET NULL
);

-- Indexes cho signature_request_signers
CREATE INDEX IF NOT EXISTS idx_signature_request_signers_request ON signature_request_signers(request_id);
CREATE INDEX IF NOT EXISTS idx_signature_request_signers_signer ON signature_request_signers(signer_id);
CREATE INDEX IF NOT EXISTS idx_signature_request_signers_email ON signature_request_signers(signer_email);
CREATE INDEX IF NOT EXISTS idx_signature_request_signers_status ON signature_request_signers(status);

-- 6. Audit Events table (logging)
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes cho audit_events
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_document ON audit_events(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- ============================================
-- RLS (Row Level Security) Policies
-- ============================================

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_request_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Documents policies
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = owner_id);

-- User Signatures policies
CREATE POLICY "Users can view their own signatures" ON user_signatures
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signatures" ON user_signatures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures" ON user_signatures
  FOR UPDATE USING (auth.uid() = user_id);

-- Document Signatures policies
CREATE POLICY "Users can view document signatures" ON document_signatures
  FOR SELECT USING (true); -- Anyone can verify signatures

CREATE POLICY "Users can insert their own signatures" ON document_signatures
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Signature Requests policies
CREATE POLICY "Users can view their signature requests" ON signature_requests
  FOR SELECT USING (
    auth.uid() = creator_id OR 
    EXISTS (
      SELECT 1 FROM signature_request_signers 
      WHERE request_id = signature_requests.id 
      AND (signer_id = auth.uid() OR signer_email = auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can insert signature requests" ON signature_requests
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their signature requests" ON signature_requests
  FOR UPDATE USING (auth.uid() = creator_id);

-- Signature Request Signers policies
CREATE POLICY "Users can view signers" ON signature_request_signers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM signature_requests 
      WHERE id = signature_request_signers.request_id 
      AND (creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM signature_request_signers s 
        WHERE s.request_id = signature_requests.id 
        AND (s.signer_id = auth.uid() OR s.signer_email = auth.jwt()->>'email')
      ))
    )
  );

-- Audit Events policies
CREATE POLICY "Users can view their audit events" ON audit_events
  FOR SELECT USING (auth.uid() = actor_id);

-- ============================================
-- Trigger để tự động update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.update_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
