import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const profileFromBackendRef = useRef(null); // Lưu profile từ backend để tránh bị ghi đè
  const isSigningInRef = useRef(false); // Flag để biết đang trong quá trình signIn

  /**
   * Load user profile từ database
   * Dùng backend API để tránh RLS policy issues
   */
  const loadUserProfile = async (userId) => {
    console.log('🔄 loadUserProfile called for userId:', userId);
    try {
      // Thử dùng backend API trước (có auth token)
      try {
        console.log('📡 Attempting to load profile from backend API...');
        const { authAPI } = await import('../lib/api');
        const result = await authAPI.getMe();
        console.log('📡 Backend API response:', result);
        if (result && result.success && result.data?.profile) {
          console.log('✅ Profile loaded from backend API:', result.data.profile);
          return result.data.profile;
        } else if (result && result.data?.profile) {
          // Nếu không có success field nhưng có profile
          console.log('✅ Profile loaded from backend API (no success field):', result.data.profile);
          return result.data.profile;
        } else {
          console.warn('⚠️ Backend API response không có profile:', result);
        }
      } catch (apiError) {
        console.error('❌ Backend API failed:', apiError);
        console.warn('⚠️ Backend API failed, trying direct Supabase query...');
      }

      // Fallback: query trực tiếp từ Supabase (có thể bị RLS block)
      console.log('📡 Attempting to load profile from Supabase directly...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Error loading user profile from Supabase:', error);
        return null;
      }

      if (data) {
        console.log('✅ Profile loaded from Supabase:', data);
        return data;
      }

      console.warn('⚠️ No profile data found');
      return null;
    } catch (error) {
      console.error('❌ Error in loadUserProfile:', error);
      return null;
    }
  };

  /**
   * Đăng ký
   */
  const signUp = async (email, password, full_name, company_name) => {
    try {
      const result = await authAPI.register(email, password, full_name, company_name);

      if (!result.success) {
        throw new Error(result.message || 'Đăng ký thất bại');
      }

      // Backend trả về session và profile
      if (result.data?.session?.access_token) {
        const profileData = result.data?.profile;
        
        // Set profile và ref TRƯỚC khi setSession
        if (profileData) {
          console.log('✅ Profile từ backend response:', profileData);
          profileFromBackendRef.current = profileData;
          setUserProfile(profileData);
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Set session vào Supabase client
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }

        if (sessionData.user) {
          setUser(sessionData.user);
          if (profileData) {
            profileFromBackendRef.current = profileData;
            setUserProfile(profileData);
          }
          return sessionData;
        }
      }

      throw new Error('Không nhận được session từ server');
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  /**
   * Đăng nhập
   */
  const signIn = async (email, password) => {
    try {
      // Set flag TRƯỚC khi gọi API để onAuthStateChange biết đang trong quá trình signIn
      isSigningInRef.current = true;
      console.log('🔵 signIn started, isSigningInRef set to true');
      
      const result = await authAPI.login(email, password);

      if (!result.success) {
        isSigningInRef.current = false;
        throw new Error(result.message || 'Đăng nhập thất bại');
      }

      // Backend trả về session và profile
      if (result.data?.session?.access_token) {
        const profileData = result.data?.profile;
        
        // QUAN TRỌNG: Set profile và ref TRƯỚC khi setSession
        if (profileData) {
          console.log('✅ Profile từ backend response:', profileData);
          console.log('✅ Role:', profileData.role);
          
          // Lưu vào ref TRƯỚC (quan trọng nhất)
          profileFromBackendRef.current = profileData;
          console.log('✅ Profile ref set BEFORE setSession');
          console.log('✅ profileFromBackendRef.current after set:', profileFromBackendRef.current);
          
          // Set profile state TRƯỚC khi setSession
          setUserProfile(profileData);
          console.log('✅ Profile state set BEFORE setSession, role:', profileData.role);
          
          // Đợi lâu hơn để đảm bảo state và ref được set hoàn toàn
          // Và để onAuthStateChange có thời gian check ref
          await new Promise(resolve => setTimeout(resolve, 300));
          console.log('✅ Waited 300ms, ref still exists:', !!profileFromBackendRef.current);
        }
        
        // Set session vào Supabase client (sẽ trigger onAuthStateChange NGAY LẬP TỨC)
        console.log('🔵 About to call setSession, ref exists:', !!profileFromBackendRef.current);
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: result.data.session.access_token,
          refresh_token: result.data.session.refresh_token,
        });
        console.log('🔵 setSession completed, ref exists:', !!profileFromBackendRef.current);

        if (sessionError) {
          isSigningInRef.current = false;
          throw sessionError;
        }

        // Set user
        if (sessionData.user) {
          setUser(sessionData.user);
          
          // Đảm bảo profile được set lại (sau khi setSession)
          if (profileData) {
            // Đảm bảo ref vẫn còn
            profileFromBackendRef.current = profileData;
            setUserProfile(profileData);
            console.log('✅ Profile set AFTER setSession, role:', profileData.role);
            
            // Set lại nhiều lần để đảm bảo persist
            setTimeout(() => {
              setUserProfile(profileData);
              console.log('✅ Profile re-set (200ms):', profileData.role);
            }, 200);
            setTimeout(() => {
              setUserProfile(profileData);
              console.log('✅ Profile re-set (500ms):', profileData.role);
            }, 500);
            setTimeout(() => {
              setUserProfile(profileData);
              console.log('✅ Profile re-set (1000ms):', profileData.role);
              isSigningInRef.current = false; // Clear flag sau khi hoàn tất
            }, 1000);
          } else {
            // Nếu không có profile trong response, load từ database
            console.warn('⚠️ Profile không có trong response, thử load từ database...');
            await new Promise(resolve => setTimeout(resolve, 500));
            const profile = await loadUserProfile(sessionData.user.id);
            if (profile) {
              setUserProfile(profile);
              console.log('✅ Profile loaded after login:', profile);
              console.log('✅ Role:', profile.role);
            } else {
              console.warn('⚠️ Profile không tìm thấy sau khi đăng nhập');
            }
            isSigningInRef.current = false;
          }
          
          console.log('✅ Login successful, user and profile set');
          // Clear flag ngay sau khi login thành công
          isSigningInRef.current = false;
          // Đảm bảo loading được clear ngay (không đợi onAuthStateChange)
          setLoading(false);
          return sessionData;
        }

        isSigningInRef.current = false;
        throw new Error('Không nhận được user từ session');
      }
      
      isSigningInRef.current = false;
    } catch (error) {
      isSigningInRef.current = false;
      console.error('Sign in error:', error);
      throw error;
    }
  };

  /**
   * Đăng xuất
   */
  const signOut = async () => {
    try {
      console.log('🔴 Starting logout process...');
      
      // Clear state TRƯỚC (quan trọng để PrivateRoute không redirect)
      setUser(null);
      setUserProfile(null);
      profileFromBackendRef.current = null;
      isSigningInRef.current = false;
      // Clear loading ngay để tránh delay
      setLoading(false);

      // Clear TẤT CẢ localStorage keys liên quan đến Supabase TRƯỚC khi signOut
      // Điều này đảm bảo Supabase không thể restore session từ localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
          console.log('🗑️ Removed localStorage key:', key);
        }
      });

      // Clear TẤT CẢ sessionStorage
      sessionStorage.clear();
      console.log('🗑️ Cleared sessionStorage');

      // Sau đó mới sign out từ Supabase
      // Không dùng scope: 'global' vì có thể không được support ở tất cả environments
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Supabase signOut error:', signOutError);
      }

      // Clear lại một lần nữa để đảm bảo
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // Đợi một chút để đảm bảo tất cả async operations hoàn tất
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check lại session để đảm bảo đã clear
      await new Promise(resolve => setTimeout(resolve, 200)); // Đợi thêm để đảm bảo
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.warn('⚠️ Session still exists after signOut, forcing clear again...');
        // Force clear bằng cách remove tất cả keys và clear state
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
        // Clear state một lần nữa
        setUser(null);
        setUserProfile(null);
        profileFromBackendRef.current = null;
        // Force signOut lại
        await supabase.auth.signOut().catch(() => {});
      } else {
        console.log('✅ Session cleared successfully');
      }

      // Đảm bảo loading được clear
      setLoading(false);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('Sign out error:', error);
      // Vẫn clear state ngay cả khi có lỗi
      setUser(null);
      setUserProfile(null);
      profileFromBackendRef.current = null;
      isSigningInRef.current = false;
      // Clear storage ngay cả khi có lỗi
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      throw error;
    }
  };

  // Lắng nghe thay đổi auth state
  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false; // Flag để tránh load profile 2 lần
    let getSessionPromise = null; // Track getSession promise

    // Load initial session TRƯỚC khi setup onAuthStateChange
    getSessionPromise = supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return

      if (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setUserProfile(null);
        profileFromBackendRef.current = null;
        setLoading(false);
        return;
      }

      const hasStorageKeys = Object.keys(localStorage).some(key => key.startsWith('sb-'));
      
      if (session?.user && hasStorageKeys) {
        console.log('📥 Initial session found:', session.user.email);
        setUser(session.user)
        
        // Load profile từ database (QUAN TRỌNG: load ngay ở đây để có data khi F5)
        try {
          console.log('📥 Loading profile from database for initial session...');
          console.log('📥 User ID:', session.user.id);
          console.log('📥 User Email:', session.user.email);
          
          // Đảm bảo có session token trước khi gọi API
          // QUAN TRỌNG: Refresh session để đảm bảo token còn hợp lệ
          let { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
          
          // Nếu không có session hoặc có lỗi, thử refresh
          if (!currentSession || sessionError) {
            console.log('⚠️ No session or session error, attempting to refresh...');
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            if (refreshedSession) {
              currentSession = refreshedSession;
              console.log('✅ Session refreshed successfully');
            }
          }
          
          if (!currentSession?.access_token) {
            console.error('❌ No access token found after refresh, cannot load profile');
            // Fallback: thử query trực tiếp từ Supabase (có thể bị RLS block)
            console.log('⚠️ Attempting direct Supabase query as fallback...');
            const { data: directProfile, error: directError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (directProfile && !directError) {
              console.log('✅ Profile loaded from direct Supabase query:', directProfile);
              setUserProfile(directProfile);
              initialLoadDone = true;
              if (mounted) {
                setLoading(false);
              }
              return;
            } else {
              console.error('❌ Direct Supabase query also failed:', directError);
              setUserProfile(null);
              if (mounted) {
                setLoading(false);
              }
              return;
            }
          }
          console.log('✅ Access token found, proceeding to load profile...');
          
          const profile = await loadUserProfile(session.user.id);
          if (!mounted) {
            setLoading(false);
            return;
          }
          if (profile) {
            setUserProfile(profile)
            console.log('✅ Initial profile loaded:', profile)
            console.log('✅ Role:', profile.role)
            console.log('✅ Avatar URL:', profile.avatar_url)
            initialLoadDone = true; // Đánh dấu đã load xong
          } else {
            console.warn('⚠️ Profile not found for user:', session.user.id);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('❌ Error loading profile:', error);
          console.error('❌ Error details:', error.message, error.stack);
          setUserProfile(null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        console.log('📥 No valid session found (session:', !!session, ', hasStorageKeys:', hasStorageKeys, ')');
        setUser(null);
        setUserProfile(null);
        profileFromBackendRef.current = null;
        if (session) {
          console.warn('⚠️ Found session but no storage keys, clearing...');
          await supabase.auth.signOut().catch(() => {});
        }
        setLoading(false)
      }
    });

    // Lắng nghe thay đổi auth state (sau khi getSession đã chạy)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      console.log('🔔 Auth state change event:', event, 'has session:', !!session)

      // Nếu là SIGNED_OUT event, chỉ clear state, không làm gì thêm
      if (event === 'SIGNED_OUT') {
        console.log('🔔 Auth state change: SIGNED_OUT')
        setUser(null)
        setUserProfile(null)
        profileFromBackendRef.current = null
        isSigningInRef.current = false
        initialLoadDone = false
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
        setLoading(false)
        return
      }

      // Nếu có session, set user nhưng chỉ load profile nếu đang signIn
      if (session?.user) {
        setUser(session.user)
        
        // QUAN TRỌNG: Chỉ load profile nếu đang trong quá trình signIn
        // Với F5, getSession() đã load profile rồi, không cần load lại
        if (event === 'SIGNED_IN' && isSigningInRef.current) {
          console.log('🔔 SIGNED_IN event detected, isSigningInRef:', isSigningInRef.current)
          
          // Đợi tối đa 300ms để ref được set
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 100))
            if (profileFromBackendRef.current) {
              console.log(`✅ Profile ref found after ${(i + 1) * 100}ms`)
              break
            }
          }
          
          // Check ref ngay lập tức
          if (profileFromBackendRef.current) {
            console.log('✅ Using profile from backend ref')
            setUserProfile(profileFromBackendRef.current)
            isSigningInRef.current = false
            initialLoadDone = true
            setLoading(false)
            return
          }
          
          // Nếu không có ref, load từ database
          console.log('⚠️ Loading profile from database (SIGNED_IN event)')
          try {
            const currentProfile = await loadUserProfile(session.user.id)
            if (!mounted) {
              setLoading(false);
              return;
            }
            if (currentProfile) {
              setUserProfile(currentProfile)
              console.log('✅ Profile loaded on auth state change:', currentProfile)
              initialLoadDone = true
              // CHỈ set loading = false khi đã có profile
              if (mounted) {
                setLoading(false)
              }
            } else {
              // Không có profile, nhưng vẫn set loading = false để không bị stuck
              if (mounted) {
                setLoading(false)
              }
            }
          } catch (error) {
            console.error('Error loading profile:', error)
            // Nếu có lỗi, vẫn set loading = false để không bị stuck
            if (mounted) {
              setLoading(false)
            }
          } finally {
            isSigningInRef.current = false
          }
        } else {
          // Không phải SIGNED_IN hoặc không đang signIn → getSession() đã load rồi
          // KHÔNG set loading = false ở đây, để getSession() tự quản lý
          console.log(`⏭️ Skipping profile load (event: ${event}, isSigningIn: ${isSigningInRef.current}, initialLoadDone: ${initialLoadDone})`)
          isSigningInRef.current = false
          // Chỉ set loading = false nếu đã có profile (từ getSession)
          if (initialLoadDone && mounted) {
            setLoading(false)
          }
        }
      } else {
        // Không có session
        setUser(null)
        setUserProfile(null)
        profileFromBackendRef.current = null
        isSigningInRef.current = false
        initialLoadDone = false
        setLoading(false)
      }
    })


    // Timeout để tránh loading quá lâu (tăng lên 15s để đủ thời gian load profile)
    const timeout = setTimeout(() => {
      if (mounted) {
        console.log('⚠️ Auth loading timeout, checking state...')
        console.log('⚠️ Current user:', user ? user.email : 'null')
        console.log('⚠️ Current userProfile:', userProfile ? 'exists' : 'null')
        
        // Nếu không có user → không có session → set loading = false
        if (!user) {
          console.log('⚠️ No user found, setting loading to false')
          setLoading(false)
        } else if (!userProfile) {
          // Có user nhưng chưa có profile → đợi thêm 5s nữa
          console.log('⏳ User exists but profile not loaded yet, waiting additional 5s...')
          setTimeout(() => {
            if (mounted) {
              // Sau 5s nữa, nếu vẫn chưa có profile thì mới set loading = false
              // Nhưng vẫn giữ user để có thể hiển thị một phần
              console.log('⚠️ Profile still not loaded after additional wait, setting loading to false')
              setLoading(false)
            }
          }, 5000) // Đợi thêm 5s
        } else {
          // Đã có cả user và profile → set loading = false
          console.log('✅ User and profile both exist, setting loading to false')
          setLoading(false)
        }
      }
    }, 15000) // Tăng timeout lên 15 seconds để đủ thời gian load profile

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  /**
   * Reload user profile (public function)
   */
  const reloadUserProfile = async () => {
    if (user?.id) {
      const profile = await loadUserProfile(user.id);
      if (profile) {
        setUserProfile(profile);
      }
      return profile;
    }
    return null;
  };

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    loadUserProfile: reloadUserProfile,
    isAuthenticated: !!user,
    isAdmin: userProfile?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
