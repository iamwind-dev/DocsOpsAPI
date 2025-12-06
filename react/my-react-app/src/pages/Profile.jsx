import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';
import '../styles/dashboard.css';

const Profile = () => {
    const { user, userProfile, loadUserProfile: reloadProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        company_name: '',
        avatar_url: ''
    });

    useEffect(() => {
        if (userProfile) {
            setFormData({
                full_name: userProfile.full_name || '',
                email: userProfile.email || user?.email || '',
                company_name: userProfile.company_name || '',
                avatar_url: userProfile.avatar_url || ''
            });
        }
    }, [userProfile, user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Vui lòng chọn file ảnh' });
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Kích thước file không được vượt quá 5MB' });
            return;
        }

        setUploading(true);
        setMessage({ type: '', text: '' });

        try {
            // Upload avatar qua backend API
            const result = await authAPI.uploadAvatar(file);
            
            if (result.success && result.data) {
                const { avatar_url, profile } = result.data;
                
                // Update form data với avatar URL mới
                setFormData(prev => ({
                    ...prev,
                    avatar_url: avatar_url || ''
                }));

                // Reload user profile để cập nhật state
                const updatedProfile = await reloadProfile();
                if (updatedProfile) {
                    setFormData(prev => ({
                        ...prev,
                        avatar_url: updatedProfile.avatar_url || ''
                    }));
                }

                setMessage({ type: 'success', text: result.message || 'Avatar đã được cập nhật thành công!' });
            } else {
                throw new Error(result.message || 'Upload avatar thất bại');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            setMessage({ 
                type: 'error', 
                text: error.message || 'Có lỗi xảy ra khi upload avatar' 
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Sử dụng backend API để cập nhật profile
            const result = await authAPI.updateProfile({
                full_name: formData.full_name,
                company_name: formData.company_name
            });

            if (result.success && result.data) {
                // Reload user profile
                const updatedProfile = await reloadProfile();
                if (updatedProfile) {
                    setFormData(prev => ({
                        ...prev,
                        full_name: updatedProfile.full_name || '',
                        company_name: updatedProfile.company_name || ''
                    }));
                }

                setMessage({ type: 'success', text: result.message || 'Thông tin đã được cập nhật thành công!' });
            } else {
                throw new Error(result.message || 'Cập nhật thông tin thất bại');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ 
                type: 'error', 
                text: error.message || 'Có lỗi xảy ra khi cập nhật thông tin' 
            });
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const displayAvatar = formData.avatar_url || null;

    return (
        <div className="dashboard-body">
            <div className="page-title">
                <h2>Thông tin tài khoản</h2>
                <p>Quản lý thông tin cá nhân và cài đặt tài khoản của bạn</p>
            </div>

            {message.text && (
                <div 
                    style={{ 
                        padding: '12px 16px', 
                        background: message.type === 'success' ? '#d1fae5' : '#fee2e2', 
                        color: message.type === 'success' ? '#065f46' : '#991b1b', 
                        borderRadius: '8px', 
                        marginBottom: '24px',
                        fontSize: '14px'
                    }}
                >
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                {/* Avatar Section */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
                            {displayAvatar ? (
                                <img 
                                    src={displayAvatar} 
                                    alt="Avatar" 
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '4px solid var(--accent)'
                                    }}
                                />
                            ) : (
                                <div 
                                    style={{
                                        width: '150px',
                                        height: '150px',
                                        borderRadius: '50%',
                                        background: 'var(--accent)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '48px',
                                        fontWeight: 'bold',
                                        margin: '0 auto',
                                        border: '4px solid var(--accent)'
                                    }}
                                >
                                    {getInitials(formData.full_name)}
                                </div>
                            )}
                            <label 
                                htmlFor="avatar-upload"
                                style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    right: '0',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: '3px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                <i className="fas fa-camera"></i>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                        {uploading && (
                            <div style={{ color: 'var(--text-light)', fontSize: '14px', marginTop: '10px' }}>
                                <i className="fas fa-spinner fa-spin"></i> Đang upload...
                            </div>
                        )}
                        <h3 style={{ marginTop: '20px', marginBottom: '5px' }}>
                            {formData.full_name || 'Chưa có tên'}
                        </h3>
                        <p style={{ color: 'var(--text-light)', fontSize: '14px' }}>
                            {formData.email}
                        </p>
                        {formData.company_name && (
                            <p style={{ color: 'var(--text-light)', fontSize: '13px', marginTop: '5px' }}>
                                <i className="fas fa-building" style={{ marginRight: '5px' }}></i>
                                {formData.company_name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Profile Form */}
                <div className="card">
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Họ và tên</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Nhập họ và tên"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                disabled
                                className="form-input"
                                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '5px' }}>
                                Email không thể thay đổi
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Tên doanh nghiệp</label>
                            <input
                                type="text"
                                name="company_name"
                                value={formData.company_name}
                                onChange={handleInputChange}
                                className="form-input"
                                placeholder="Nhập tên doanh nghiệp"
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="form-label">Vai trò</label>
                            <input
                                type="text"
                                value={userProfile?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                                disabled
                                className="form-input"
                                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                            <button
                                type="submit"
                                className="btn-sm"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.7 : 1
                                }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn-sm"
                                style={{
                                    background: 'var(--bg-body)',
                                    color: 'var(--text-dark)',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer'
                                }}
                                onClick={() => {
                                    setFormData({
                                        full_name: userProfile?.full_name || '',
                                        email: userProfile?.email || user?.email || '',
                                        company_name: userProfile?.company_name || '',
                                        avatar_url: userProfile?.avatar_url || ''
                                    });
                                    setMessage({ type: '', text: '' });
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;

