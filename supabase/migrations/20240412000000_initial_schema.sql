-- Initial Schema Migration

-- 1. Profiles (Users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'technician', 'user')) DEFAULT 'technician',
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, permissions)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário'), 
    CASE 
      WHEN new.email = 'pabloplacidoo@gmail.com' THEN 'admin'
      ELSE 'technician'
    END,
    CASE 
      WHEN new.email = 'pabloplacidoo@gmail.com' THEN '{
        "canCreateOS": true, "canEditOS": true, "canDeleteOS": true, "canSeeAllOS": true,
        "canManageUsers": true, "canCreateMaterials": true, "canEditMaterials": true,
        "canDeleteMaterials": true, "canCreateDocuments": true, "canEditDocuments": true,
        "canDeleteDocuments": true, "canManageSettings": true, "canViewReports": true,
        "canViewOSReports": true, "canViewMaterialReports": true, "canViewTechnicianReports": true,
        "canViewFinancialReports": true, "canFinalizeOS": true, "canApproveOS": true
      }'::jsonb
      ELSE '{}'::jsonb
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Materials
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  price DECIMAL(10, 2) DEFAULT 0,
  cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('start', 'finish', 'general', 'os_layout')) NOT NULL,
  require_client_signature BOOLEAN DEFAULT TRUE,
  require_representative_signature BOOLEAN DEFAULT FALSE,
  paper_size TEXT DEFAULT 'A4',
  header_image TEXT,
  header_image_config JSONB,
  margins TEXT,
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Service Orders
CREATE TABLE IF NOT EXISTS service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  house_number TEXT,
  tower TEXT,
  floor TEXT,
  unit TEXT,
  block TEXT,
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('Aberta', 'Vistoria', 'Em andamento', 'Concluída', 'Cancelada')) DEFAULT 'Aberta',
  is_rework BOOLEAN DEFAULT FALSE,
  assigned_technician_id UUID REFERENCES profiles(id),
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  survey_at TIMESTAMP WITH TIME ZONE,
  survey_completed BOOLEAN DEFAULT FALSE,
  media JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  pre_inspection JSONB DEFAULT '[]'::jsonb,
  completion_checklist JSONB DEFAULT '[]'::jsonb,
  required_documents JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  signature TEXT,
  is_signed_by_client BOOLEAN DEFAULT FALSE,
  is_under_warranty BOOLEAN DEFAULT FALSE,
  warranty_years INTEGER,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  deadline TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  cost DECIMAL(10, 2),
  root_cause TEXT,
  critical_failure_index INTEGER,
  normalization_applied BOOLEAN DEFAULT FALSE,
  peng_crossings JSONB DEFAULT '[]'::jsonb,
  estimated_normalization_saving DECIMAL(10, 2),
  technical_recommendation TEXT,
  criticality_level TEXT CHECK (criticality_level IN ('low', 'medium', 'high')),
  auditor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('new_os', 'os_completed', 'os_delayed', 'os_updated', 'deadline_approaching')) NOT NULL,
  os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY, -- e.g., 'system'
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS (Row Level Security)

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Materials
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials are viewable by everyone." ON materials FOR SELECT USING (true);
CREATE POLICY "Admins can manage materials." ON materials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Document Templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are viewable by everyone." ON document_templates FOR SELECT USING (true);
CREATE POLICY "Admins can manage templates." ON document_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Service Orders
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service orders are viewable by authenticated users." ON service_orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Technicians can update assigned service orders." ON service_orders FOR UPDATE USING (
  assigned_technician_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage all service orders." ON service_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications." ON notifications FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update their own notifications." ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by authenticated users." ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage settings." ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
