-- ============================================
-- E-SIGNATURE MODULE - SCHEMA EXTENSION
-- Additive only - does NOT modify existing tables
-- Run after schema.sql in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Signature Placeholders
-- Quản lý vị trí đặt chữ ký trên PDF
-- ============================================
CREATE TABLE IF NOT EXISTS signature_placeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signature_request_signers(id) ON DELETE CASCADE,
  page_number INT NOT NULL DEFAULT 1,
  x_position DECIMAL(10,2) NOT NULL,
  y_position DECIMAL(10,2) NOT NULL,
  width DECIMAL(10,2) DEFAULT 200,
  height DECIMAL(10,2) DEFAULT 50,
  placeholder_type TEXT DEFAULT 'signature' CHECK (placeholder_type IN ('signature', 'initial', 'date', 'text')),
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_placeholders_request ON signature_placeholders(request_id);
CREATE INDEX IF NOT EXISTS idx_placeholders_signer ON signature_placeholders(signer_id);

-- ============================================
-- 2. Notifications
-- Quản lý notifications đa kênh
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'telegram', 'zalo', 'webhook')),
  event_type TEXT NOT NULL,
  subject TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_type);

-- ============================================
-- 3. Reminder Tracking
-- Theo dõi hệ thống reminder 3 cấp
-- ============================================
CREATE TABLE IF NOT EXISTS reminder_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id UUID NOT NULL REFERENCES signature_request_signers(id) ON DELETE CASCADE,
  reminder_level INT NOT NULL CHECK (reminder_level IN (1, 2, 3)),
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(signer_id, reminder_level)
);

CREATE INDEX IF NOT EXISTS idx_reminder_signer ON reminder_tracking(signer_id);

-- ============================================
-- 4. Signing Sessions
-- Theo dõi phiên ký để phát hiện fraud
-- ============================================
CREATE TABLE IF NOT EXISTS signing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signer_id UUID NOT NULL REFERENCES signature_request_signers(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  signed_at TIMESTAMPTZ,
  duration_seconds INT,
  is_suspicious BOOLEAN DEFAULT false,
  suspicion_reasons JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sessions_signer ON signing_sessions(signer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_suspicious ON signing_sessions(is_suspicious);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON signing_sessions(started_at DESC);

-- ============================================
-- 5. Completion Certificates
-- Lưu trữ Certificate of Completion
-- ============================================
CREATE TABLE IF NOT EXISTS completion_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES signature_requests(id) ON DELETE CASCADE,
  certificate_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_certificates_request ON completion_certificates(request_id);

-- ============================================
-- 6. Approval Steps (for Multi-Step flow)
-- Quản lý workflow phê duyệt nhiều bước
-- ============================================
CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('approval', 'signature')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_email TEXT NOT NULL,
  assignee_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
  completed_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_assignee ON approval_steps(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);

-- ============================================
-- 7. Document Metadata
-- Metadata bổ sung cho documents
-- ============================================
CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  page_count INT,
  file_size_bytes BIGINT,
  thumbnail_path TEXT,
  extracted_text TEXT,
  watermark_status TEXT DEFAULT 'none' CHECK (watermark_status IN ('none', 'pending', 'completed')),
  archived_at TIMESTAMPTZ,
  archive_path TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_metadata_document ON document_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_metadata_archived ON document_metadata(archived_at);

-- ============================================
-- RLS Policies for New Tables
-- ============================================

-- Enable RLS
ALTER TABLE signature_placeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;

-- Signature Placeholders: Users can view placeholders for requests they're involved in
CREATE POLICY "View placeholders policy" ON signature_placeholders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM signature_requests sr
      WHERE sr.id = signature_placeholders.request_id
      AND (sr.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM signature_request_signers srs
        WHERE srs.request_id = sr.id
        AND (srs.signer_id = auth.uid() OR srs.signer_email = auth.jwt()->>'email')
      ))
    )
  );

CREATE POLICY "Insert placeholders policy" ON signature_placeholders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM signature_requests sr
      WHERE sr.id = signature_placeholders.request_id
      AND sr.creator_id = auth.uid()
    )
  );

-- Notifications: Users can view their own notifications
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (recipient_id = auth.uid() OR recipient_email = auth.jwt()->>'email');

-- Completion Certificates: Viewable by request participants
CREATE POLICY "View certificates policy" ON completion_certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM signature_requests sr
      WHERE sr.id = completion_certificates.request_id
      AND (sr.creator_id = auth.uid() OR EXISTS (
        SELECT 1 FROM signature_request_signers srs
        WHERE srs.request_id = sr.id
        AND (srs.signer_id = auth.uid() OR srs.signer_email = auth.jwt()->>'email')
      ))
    )
  );

-- Approval Steps: Viewable by request participants and assignees
CREATE POLICY "View approval steps policy" ON approval_steps
  FOR SELECT USING (
    assignee_id = auth.uid() OR assignee_email = auth.jwt()->>'email' OR
    EXISTS (
      SELECT 1 FROM signature_requests sr
      WHERE sr.id = approval_steps.request_id
      AND sr.creator_id = auth.uid()
    )
  );

-- Document Metadata: Same as documents
CREATE POLICY "View document metadata policy" ON document_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_metadata.document_id
      AND d.owner_id = auth.uid()
    )
  );

-- ============================================
-- Service Role Bypass for n8n/internal access
-- Note: Service role key bypasses RLS by default
-- ============================================

-- Grant usage on tables to service role (for n8n)
GRANT ALL ON signature_placeholders TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON reminder_tracking TO service_role;
GRANT ALL ON signing_sessions TO service_role;
GRANT ALL ON completion_certificates TO service_role;
GRANT ALL ON approval_steps TO service_role;
GRANT ALL ON document_metadata TO service_role;
