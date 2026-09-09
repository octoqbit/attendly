-- ✅ Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty')),
  branch TEXT DEFAULT '',
  year TEXT DEFAULT '',
  roll_number TEXT DEFAULT '',
  faculty_id TEXT DEFAULT '',
  department TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  face_id TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_code TEXT DEFAULT '',
  branch TEXT DEFAULT '',
  year TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_date DATE,
  opening_time TIME,
  closing_time TIME,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  gps_verified BOOLEAN DEFAULT FALSE,
  face_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_classes_faculty_id ON classes(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ✅ Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ✅ Create RLS policies - Allow all for now (you can restrict later)
-- Drop existing policies first (safe to re-run)
DROP POLICY IF EXISTS "Enable all access" ON users;
DROP POLICY IF EXISTS "Enable all access" ON classes;
DROP POLICY IF EXISTS "Enable all access" ON attendance;

CREATE POLICY "Enable all access" ON users
  FOR ALL USING (true);

CREATE POLICY "Enable all access" ON classes
  FOR ALL USING (true);

CREATE POLICY "Enable all access" ON attendance
  FOR ALL USING (true);

-- ✅ Done!