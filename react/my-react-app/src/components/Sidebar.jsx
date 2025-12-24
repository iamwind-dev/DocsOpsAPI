import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/dashboard.css';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { userProfile, signOut, isAdmin } = useAuth();

    const isActive = (path) => {
        return location.pathname === path;
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

    const handleLinkClick = () => {
        // Đóng sidebar khi click vào link trên mobile
        if (window.innerWidth <= 768) {
            onClose();
        }
    };

    return (
        <>
            {/* Overlay cho mobile */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <i className="fa-solid fa-cube" style={{color: '#3b82f6', marginRight: '10px'}}></i> AI DocOps
                    <button className="sidebar-close-btn" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            <div className="sidebar-menu">
                <div className="menu-label">Tổng quan</div>
                <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} onClick={handleLinkClick}>
                    <i className="fas fa-home"></i> Dashboard
                </Link>

                <div className="menu-label" style={{marginTop: '20px'}}>AI Agents</div>
                <Link to="/documents" className={isActive('/documents') ? 'active' : ''} onClick={handleLinkClick}>
                    <i className="fas fa-folder-open"></i> Kho tài liệu
                </Link>
                <Link to="/esignature" className={isActive('/esignature') ? 'active' : ''} onClick={handleLinkClick}>
                    <i className="fas fa-file-signature"></i> Chữ ký số
                </Link>
                {isAdmin && (
                    <Link to="/audit" className={isActive('/audit') ? 'active' : ''} onClick={handleLinkClick}>
                        <i className="fas fa-shield-alt"></i> Audit Logs
                    </Link>
                )}
                <Link to="/storage" className={isActive('/storage') ? 'active' : ''} onClick={handleLinkClick}>
                    <i className="fas fa-database"></i> Lưu trữ
                </Link>

                <div className="menu-label" style={{marginTop: '20px'}}>Hệ thống</div>
                <Link to="/settings" className={isActive('/settings') ? 'active' : ''} onClick={handleLinkClick}>
                    <i className="fas fa-cog"></i> Cài đặt
                </Link>
                <button 
                    onClick={handleLogout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 20px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                >
                    <i className="fas fa-sign-out-alt"></i> Đăng xuất
                </button>
            </div>
        </aside>
        </>
    );
};

export default Sidebar;
