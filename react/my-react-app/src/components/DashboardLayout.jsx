import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { documentAPI } from '../lib/api';
import '../styles/dashboard.css';

const DashboardLayout = ({ children }) => {
    const { userProfile, user, signOut, loading } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const dropdownRef = useRef(null);
    const searchRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    
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
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        if (showDropdown || showSearchResults) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown, showSearchResults]);

    // Search documents với debounce
    const performSearch = useCallback(async (query) => {
        if (!query || query.trim().length === 0) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setIsSearching(true);
        try {
            const result = await documentAPI.searchDocuments(query);
            const documents = result.data?.documents || [];
            setSearchResults(documents);
            setShowSearchResults(documents.length > 0);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
            setShowSearchResults(false);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length > 0) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchQuery);
            }, 300); // 300ms debounce
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, performSearch]);

    // Handle search input change
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    // Handle click on search result
    const handleSearchResultClick = (document) => {
        if (document.storage_path) {
            const fileUrl = `https://rtdqjujwbaotbvuioawp.supabase.co/storage/v1/object/public/${document.storage_path}`;
            window.open(fileUrl, '_blank');
        }
        setShowSearchResults(false);
        setSearchQuery('');
    };

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
                        <div className="search-box" ref={searchRef} style={{ position: 'relative' }}>
                            <i className="fas fa-search" style={{color: '#94a3b8'}}></i>
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm tài liệu, hợp đồng..." 
                                value={searchQuery}
                                onChange={handleSearchChange}
                                onFocus={() => {
                                    if (searchResults.length > 0) {
                                        setShowSearchResults(true);
                                    }
                                }}
                            />
                            {isSearching && (
                                <i className="fas fa-spinner fa-spin" style={{
                                    position: 'absolute',
                                    right: '12px',
                                    color: '#94a3b8',
                                    fontSize: '14px'
                                }}></i>
                            )}
                            {showSearchResults && searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                    border: '1px solid #e2e8f0',
                                    maxHeight: '400px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                }}>
                                    {searchResults.map((doc) => (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSearchResultClick(doc)}
                                            style={{
                                                padding: '12px 16px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'white';
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                            }}>
                                                <i className="fas fa-file" style={{
                                                    color: '#3b82f6',
                                                    fontSize: '18px',
                                                    flexShrink: 0,
                                                }}></i>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: 500,
                                                        fontSize: '14px',
                                                        color: '#1e293b',
                                                        marginBottom: '4px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {doc.title || 'Không có tiêu đề'}
                                                    </div>
                                                    {doc.description && (
                                                        <div style={{
                                                            fontSize: '12px',
                                                            color: '#64748b',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {doc.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <i className="fas fa-external-link-alt" style={{
                                                    color: '#94a3b8',
                                                    fontSize: '12px',
                                                    flexShrink: 0,
                                                }}></i>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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



