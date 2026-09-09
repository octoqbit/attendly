/**
 * Attendly — Production Supabase Database Service Integration
 */

// Default Supabase Configuration (loaded from live project)
const DEFAULT_SUPABASE_URL = 'https://dxbwypvtmultsdkupuze.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Ynd5cHZ0bXVsdHNka3VwdXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NDQyNzEsImV4cCI6MjEwNDUyMDI3MX0.nUWoItSnRJ3tgzzm9IXcW0cBAE8rfCjaWLUWxLNncsw';

let supabaseUrl = localStorage.getItem("attendly_supabase_url") || DEFAULT_SUPABASE_URL;
let supabaseAnonKey = localStorage.getItem("attendly_supabase_key") || DEFAULT_SUPABASE_ANON_KEY;

let supabaseClient = null;

function initSupabaseClient() {
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.warn("Supabase init error:", e);
    }
  }
}

initSupabaseClient();

const db = {
  get client() {
    return supabaseClient;
  },

  updateCredentials(url, key) {
    supabaseUrl = url;
    supabaseAnonKey = key;
    localStorage.setItem("attendly_supabase_url", url);
    localStorage.setItem("attendly_supabase_key", key);
    initSupabaseClient();
  },

  // ==========================================
  // AUTHENTICATION & USER PROFILES
  // ==========================================

  async signUp(email, password, name, role, additionalData = {}) {
    if (!supabaseClient) return { success: false, error: "Supabase client not loaded" };
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { name, role }
        }
      });

      if (error) throw error;

      if (data?.user) {
        // Create user profile in users table
        const profileObj = {
          id: data.user.id,
          email,
          name,
          role: role.toLowerCase(),
          branch: additionalData.branch || '',
          year: additionalData.year || '',
          roll_number: additionalData.roll_number || '',
          faculty_id: additionalData.faculty_id || '',
          department: additionalData.department || ''
        };

        const { error: profileErr } = await supabaseClient
          .from('users')
          .insert([profileObj]);

        if (profileErr) console.warn("Profile table insert notice:", profileErr.message);
      }

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async signIn(email, password) {
    if (!supabaseClient) return { success: false, error: "Supabase client not loaded" };
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Fetch user profile
      const { data: userProfile } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return {
        success: true,
        user: { ...data.user, ...(userProfile || {}), role: userProfile?.role ? (userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)) : 'Student' }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async signOut() {
    if (!supabaseClient) return { success: true };
    try {
      await supabaseClient.auth.signOut();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getCurrentUser() {
    if (!supabaseClient) return null;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (!data?.session) return null;

      const { data: userProfile } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();

      return {
        ...data.session.user,
        ...(userProfile || {}),
        role: userProfile?.role ? (userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)) : 'Student'
      };
    } catch (err) {
      return null;
    }
  },

  // ==========================================
  // CLASSES MANAGEMENT
  // ==========================================

  async getClasses() {
    if (!supabaseClient) return { success: false, data: [] };
    try {
      const { data, error } = await supabaseClient
        .from('classes')
        .select('*, faculty:faculty_id(name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  },

  async createClass(classObj) {
    if (!supabaseClient) return { success: false, error: "Database offline" };
    try {
      const { data, error } = await supabaseClient
        .from('classes')
        .insert([{
          name: classObj.name,
          course_code: classObj.course_code || '',
          branch: classObj.branch || '',
          year: classObj.year || '',
          description: classObj.description || '',
          status: 'open'
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateClassStatus(classId, status) {
    if (!supabaseClient) return { success: false };
    try {
      const { error } = await supabaseClient
        .from('classes')
        .update({ status })
        .eq('id', classId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ==========================================
  // ATTENDANCE LOGS
  // ==========================================

  async markAttendance(classId, studentId, gpsVerified = true, faceVerified = true) {
    if (!supabaseClient) return { success: false, error: "Database offline" };
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8);

      const { data, error } = await supabaseClient
        .from('attendance')
        .insert([{
          class_id: classId,
          student_id: studentId,
          date: dateStr,
          time: timeStr,
          gps_verified: gpsVerified,
          face_verified: faceVerified,
          status: 'present'
        }])
        .select();

      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async getAttendanceRecords() {
    if (!supabaseClient) return { success: false, data: [] };
    try {
      const { data, error } = await supabaseClient
        .from('attendance')
        .select('*, student:student_id(name, roll_number, email), class:class_id(name, course_code)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, error: err.message, data: [] };
    }
  }
};

window.db = db;
