import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import '../styles/dashboard.css';

const DashboardLayout = ({ children }) => {
    const { userProfile, user, signOut, loading } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    // Nếu đang loading hoặc chưa có profile, hiển thị loading
    if (loading || !userProfile) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '16px',
                color: 'var(--text-light)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                    Đang tải...
                </div>
            </div>
        );
    }
    
    const displayName = userProfile?.full_name || user?.email || 'User';
    const userEmail = user?.email || '';
    const avatarUrl = userProfile?.avatar_url || null;
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    // Đóng dropdown khi click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    const handleLogout = async () => {
        try {
            // Navigate về trang chủ TRƯỚC khi signOut để tránh redirect qua login
            navigate('/', { replace: true });
            // Sau đó mới signOut
            await signOut();
        } catch (error) {
            console.error('Logout error:', error);
            // Nếu có lỗi, vẫn đảm bảo navigate về trang chủ
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="app-container">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="main-content">
                <header className="top-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                        <button 
                            className="mobile-menu-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label="Toggle menu"
                        >
                            <i className="fas fa-bars"></i>
                        </button>
                        <div className="search-box">
                            <i className="fas fa-search" style={{color: '#94a3b8'}}></i>
                            <input type="text" placeholder="Tìm kiếm tài liệu, hợp đồng..." />
                        </div>
                    </div>
                    <div className="user-menu">
                        <div className="notification">
                            <i className="fas fa-bell" style={{fontSize: '20px', color: '#64748b'}}></i>
                            <span className="badge-dot"></span>
                        </div>
                        <div className="user-profile-container" ref={dropdownRef}>
                            <div 
                                className="user-profile" 
                                onClick={() => setShowDropdown(!showDropdown)}
                                style={{ cursor: 'pointer' }}
                            >
                                {avatarUrl ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt={displayName}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            marginRight: '10px'
                                        }}
                                        onError={(e) => {
                                            // Nếu ảnh lỗi, ẩn img và hiển thị initials
                                            e.target.style.display = 'none';
                                            const initialsDiv = e.target.nextElementSibling;
                                            if (initialsDiv) {
                                                initialsDiv.style.display = 'flex';
                                            }
                                        }}
                                    />
                                ) : null}
                                <div 
                                    className="avatar" 
                                    style={{ display: avatarUrl ? 'none' : 'flex' }}
                                >
                                    {initials}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{displayName}</span>
                                    {userEmail && (
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{userEmail}</span>
                                    )}
                                </div>
                                <i className="fas fa-chevron-down" style={{fontSize: '12px', color: '#94a3b8'}}></i>
                            </div>
                            {showDropdown && (
                                <div className="user-dropdown">
                                    <div 
                                        className="dropdown-item" 
                                        onClick={() => {
                                            navigate('/profile');
                                            setShowDropdown(false);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
                                        <span>Thông tin tài khoản</span>
                                    </div>
                                    <div className="dropdown-item">
                                        <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                                        <span>Cài đặt</span>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <div className="dropdown-item" onClick={handleLogout} style={{ color: '#ef4444', cursor: 'pointer' }}>
                                        <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
                                        <span>Đăng xuất</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;



