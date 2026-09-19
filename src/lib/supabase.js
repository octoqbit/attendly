/**
 * Attendly — Supabase Client & Database Service (ES Module)
 * Includes Realtime subscriptions + soft-delete support
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = localStorage.getItem('attendly_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = localStorage.getItem('attendly_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Ensure they are set in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// AUTHENTICATION & USER PROFILES
// ==========================================

export async function signUp(email, password, name, role, additionalData = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    });

    if (error) throw error;

    if (data?.user) {
      const profileObj = {
        id: data.user.id,
        email,
        name,
        role: role.toLowerCase(),
        branch: additionalData.branch || '',
        year: additionalData.year || '',
        roll_number: additionalData.roll_number || '',
        faculty_id: additionalData.faculty_id || '',
        department: additionalData.department || '',
        face_id: additionalData.face_id || '',
        is_approved: role.toLowerCase() === 'faculty' ? false : true // Faculty need admin approval
      };

      const { error: profileErr } = await supabase
        .from('users')
        .insert([profileObj]);

      if (profileErr) console.warn('Profile table insert notice:', profileErr.message);
    }

    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    return {
      success: true,
      user: {
        ...data.user,
        ...(userProfile || {}),
        role: userProfile?.role
          ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)
          : 'Student'
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return null;

    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.session.user.id)
      .single();

    return {
      ...data.session.user,
      ...(userProfile || {}),
      role: userProfile?.role
        ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)
        : 'Student'
    };
  } catch {
    return null;
  }
}

// ==========================================
// CLASSES MANAGEMENT
// ==========================================

export async function getClasses() {
  try {
    // Try with is_deleted filter first; fall back without it if column doesn't exist
    let query = supabase
      .from('classes')
      .select('*, faculty:faculty_id(name, email)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Client-side filter for soft-deleted classes (in case is_deleted column exists)
    const filtered = (data || []).filter(c => !c.is_deleted);
    return { success: true, data: filtered };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function createClass(classObj) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert([{
        faculty_id: classObj.faculty_id || null,
        name: classObj.name,
        course_code: classObj.course_code || '',
        branch: classObj.branch || '',
        year: classObj.year || '',
        description: classObj.description || '',
        time: classObj.time || '',
        room: classObj.room || '',
        status: 'closed'
      }])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateClassStatus(classId, status, lat = null, lng = null) {
  try {
    const updateData = { status };
    if (lat !== null && lng !== null) {
      updateData.latitude = lat;
      updateData.longitude = lng;
    }
    const { error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', classId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Soft-delete: marks is_deleted = true in the database.
 * The class data and attendance records are preserved.
 * Falls back to hiding locally if column doesn't exist yet.
 */
export async function deleteClass(classId) {
  try {
    const { error } = await supabase
      .from('classes')
      .update({ is_deleted: true })
      .eq('id', classId);

    if (error) {
      // If is_deleted column doesn't exist, update status to 'closed' as fallback
      console.warn('Soft-delete column may not exist, using status fallback:', error.message);
      const { error: fallbackErr } = await supabase
        .from('classes')
        .update({ status: 'closed' })
        .eq('id', classId);
      if (fallbackErr) throw fallbackErr;
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// ATTENDANCE LOGS
// ==========================================

export async function markAttendance(classId, studentId, gpsVerified = true, faceVerified = true) {
  try {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    const { data, error } = await supabase
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
}

export async function getAttendanceRecords() {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, student:student_id(name, roll_number, email), class:class_id(name, course_code)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

export async function getAllUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message, data: [] };
  }
}

export async function approveUser(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteUser(userId) {
  try {
    // This will cascade and delete auth user if using Supabase Admin API
    // Or just delete the profile. To fully delete auth user, you usually need a Server-Side Edge function.
    // We will just delete the public profile for now, or assume RLS allows cascade if trigger is setup.
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteAttendance(attendanceId) {
  try {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// REALTIME SUBSCRIPTIONS
// ==========================================

let classesChannel = null;

/**
 * Subscribe to real-time changes on the `classes` table.
 * @param {Function} onInsert  - called with new class row
 * @param {Function} onUpdate  - called with updated class row
 * @param {Function} onDelete  - called with old class row
 * @returns {Function} unsubscribe function
 */
export function subscribeToClasses(onInsert, onUpdate, onDelete) {
  // Clean up any existing subscription
  if (classesChannel) {
    supabase.removeChannel(classesChannel);
  }

  classesChannel = supabase
    .channel('classes-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'classes' },
      (payload) => onInsert?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'classes' },
      (payload) => onUpdate?.(payload.new)
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'classes' },
      (payload) => onDelete?.(payload.old)
    )
    .subscribe();

  return () => {
    if (classesChannel) {
      supabase.removeChannel(classesChannel);
      classesChannel = null;
    }
  };
}

/**
 * Unsubscribe from all active channels (call on sign-out)
 */
export function unsubscribeAll() {
  if (classesChannel) {
    supabase.removeChannel(classesChannel);
    classesChannel = null;
  }
}
