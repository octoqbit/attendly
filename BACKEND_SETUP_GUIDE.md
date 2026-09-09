# 🚀 Backend Integration Setup - Step by Step

## ✅ What We've Done So Far:

1. ✅ **Created Supabase project** - https://szlaftvgqimfzgboqyft.supabase.co
2. ✅ **Updated index.html** - Added Supabase library
3. ✅ **Created supabase-config.js** - Backend connection code
4. ✅ **Created setup-database.sql** - Database schema

## 📋 Next Steps to Complete Backend Integration:

### Step 1: Create Database Tables (IMPORTANT!)

1. **Login to Supabase Dashboard** → https://app.supabase.com
2. Go to **SQL Editor** (left sidebar)
3. Click **"New Query"** (top right)
4. Open file: **setup-database.sql** (in your project folder)
5. Copy ALL the SQL code
6. Paste it into Supabase SQL Editor
7. Click **"Run"** (or Ctrl+Enter)
8. Wait for success ✅

**Screenshot:**
```
Supabase Dashboard
  ↓
SQL Editor (left menu)
  ↓
New Query (top right)
  ↓
Paste SQL from setup-database.sql
  ↓
Click Run
  ↓
✅ Success message
```

### Step 2: Check Your Tables Were Created

1. Go to **Tables** (left sidebar)
2. You should see:
   - ✅ `users`
   - ✅ `classes`
   - ✅ `attendance`

If they're missing, run the SQL again.

### Step 3: Test Supabase Connection

1. Open your app: **http://10.248.189.131:5173**
2. Open **Browser Console** (F12 → Console tab)
3. Paste this and press Enter:

```javascript
db.supabase.auth.getSession().then(s => console.log('Session:', s));
```

**Expected Output:**
```
Session: { session: null, user: null }
```

This means the connection works! (No user logged in yet, which is normal)

### Step 4: Create Demo Users (Optional)

In Supabase SQL Editor, run this:

```sql
-- Create demo student user
INSERT INTO users (
  id, email, name, role, branch, year, roll_number, avatar
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'student@attendly.edu',
  'Aarav Mehta',
  'student',
  'Computer Science',
  '2024',
  'CS-2024-041',
  'AM'
);

-- Create demo faculty user
INSERT INTO users (
  id, email, name, role, faculty_id, department
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'faculty@attendly.edu',
  'Dr. Priya Sharma',
  'faculty',
  'FAC-018',
  'Computer Science'
);
```

**Note:** Supabase Auth will auto-create users when they sign up. These are just profile records.

### Step 5: Files You Now Have:

```
attendacesystem/
├── index.html (✅ updated)
├── styles.css (unchanged)
├── app.js (will be updated to use Supabase)
├── app-backup.js (backup of original)
├── supabase-config.js (✅ created)
├── setup-database.sql (✅ created)
├── SUPABASE_SETUP.md (setup guide)
├── BACKEND_SETUP_GUIDE.md (this file)
└── 1782272299738.png (faculty image)
```

## 🔄 What Happens Next:

Once you complete Steps 1-3 above:

**I will:**
1. Update **app.js** to use Supabase auth and database
2. Replace localStorage with Supabase storage
3. Add backend API calls for:
   - Signup (creates user in Supabase Auth + users table)
   - Login (authenticates with Supabase Auth)
   - Create Class (saves to classes table)
   - Mark Attendance (saves to attendance table)
   - Fetch Attendance Records (queries from database)
4. Test everything works end-to-end

**Time to complete:** ~20 minutes

---

## ✅ Checklist - Do This Now:

- [ ] Login to Supabase dashboard
- [ ] Run setup-database.sql in SQL Editor
- [ ] Verify tables were created (users, classes, attendance)
- [ ] Test connection in browser console
- [ ] Let me know when done!

**Once you confirm these steps, I'll update app.js and you'll be fully integrated!** 🚀

---

## 💡 Need Help?

**"I don't see the SQL Editor"**
→ In Supabase, look for "SQL" or "SQL Editor" in left sidebar

**"The SQL failed"**
→ Take a screenshot and send it to me

**"I don't see the tables"**
→ Refresh the page (Ctrl+R or Cmd+R)

**"Connection test shows error"**
→ Your supabase-config.js might have wrong keys

Let me know when you're ready! 👇
