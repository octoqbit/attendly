# 🚀 Supabase Backend Setup Guide for Attendly

## Step 1: Create Supabase Project

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with email or Google/GitHub
4. Create a new organization (or skip if you have one)
5. Create a new project:
   - **Project name:** `attendly`
   - **Database password:** (SAVE THIS - you need it later)
   - **Region:** Choose the closest to you
     - Asia: Singapore, Tokyo, or India
     - Europe: EU-Central or UK
     - Americas: US-East or US-West

6. **Wait 1-2 minutes** for the database to initialize
7. You'll see a green checkmark when ready ✅

---

## Step 2: Get Your API Keys

1. Go to **Settings → API** (left sidebar)
2. You'll see:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (public key, starts with `eyJ...`)

**Copy both and save them somewhere safe** (notepad, password manager, etc.)

---

## Step 3: Create Database Tables

1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste this SQL:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'faculty')),
  branch TEXT,
  year TEXT,
  roll_number TEXT,
  faculty_id TEXT,
  department TEXT,
  avatar TEXT,
  face_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_code TEXT,
  branch TEXT,
  year TEXT,
  description TEXT,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_date DATE,
  opening_time TIME,
  closing_time TIME,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
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

-- Create indexes for faster queries
CREATE INDEX idx_classes_faculty_id ON classes(faculty_id);
CREATE INDEX idx_attendance_class_id ON attendance(class_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_users_role ON users(role);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can see their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Faculty can see their classes" ON classes
  FOR SELECT USING (auth.uid() = faculty_id OR auth.uid() IN (
    SELECT student_id FROM attendance WHERE class_id = classes.id
  ));

CREATE POLICY "Students can see their attendance" ON attendance
  FOR SELECT USING (auth.uid() = student_id OR 
    auth.uid() IN (SELECT faculty_id FROM classes WHERE id = class_id));
```

4. Click **"Run"** (or press Ctrl+Enter)
5. Wait for success message ✅

---

## Step 4: Load Supabase Library in Your App

Add this to your **index.html** (before app.js):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
```

---

## Step 5: Update supabase-config.js

Open **supabase-config.js** and replace:

```javascript
const SUPABASE_URL = 'YOUR-PROJECT-URL-HERE';
const SUPABASE_KEY = 'YOUR-ANON-KEY-HERE';
```

With your actual keys from Step 2.

**Example:**
```javascript
const SUPABASE_URL = 'https://abcdefgh12345.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Step 6: Test the Connection

Open browser console (F12) and paste:

```javascript
db.getCurrentUser().then(user => console.log('Current user:', user));
```

If you see `null`, you're not logged in (which is expected).
If you see an object, connection is working! ✅

---

## Step 7: Migrate App to Supabase

I'll update **app.js** to:
- Use `db.signUp()` instead of localStorage
- Use `db.signIn()` for login
- Use `db.createClass()` for class creation
- Use `db.markAttendance()` for attendance
- All data syncs to Supabase automatically

---

## 📞 Common Issues

**"Invalid API key"** → Check if you copied the ANON KEY correctly (not the service key)

**"Project not found"** → Check if PROJECT URL is correct (should be https://xxxxx.supabase.co)

**"Row level security denied"** → This is normal initially; policies get updated as we develop

**"Connection timeout"** → Check your internet; Supabase might be having issues

---

## 📊 Free Tier Limits

- **500MB** database storage ✅ (Enough for 500 students + 500 classes + 50k attendance records)
- **Unlimited** API calls ✅
- **2GB** file storage ✅
- **No bandwidth limits** ✅
- **1 project** (can upgrade later)

---

## 🎯 Next Steps

1. ✅ Sign up at https://supabase.com
2. ✅ Create project "attendly"
3. ✅ Copy Project URL and Anon Key
4. ✅ Run the SQL to create tables
5. ✅ Update supabase-config.js with your keys
6. ✅ Test connection in console
7. ✅ I'll update app.js to use Supabase

**Let me know once you have your Project URL and Anon Key!**
