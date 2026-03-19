import React, { useState, useEffect } from 'react';
import api from '../api';

function ProfilePage({ userEmail, onAvatarUpdate }) {
    const [profile, setProfile] = useState({ name: '', email: '', bio: '', avatar: '' });
    const [avatar, setAvatar] = useState('');
    const [avatarPreview, setAvatarPreview] = useState('');
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [pwdMsg, setPwdMsg] = useState('');
    
    // Passwords
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            setProfile(res.data);
            setAvatar(res.data.avatar || '');
            setAvatarPreview(res.data.avatar || '');
            setLoading(false);
        } catch (e) {
            setMsg('Error loading profile');
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatar(reader.result);
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const saveProfile = async () => {
        try {
            const res = await api.put('/auth/profile', { name: profile.name, bio: profile.bio, avatar: avatar });
            setProfile(res.data);
            if (onAvatarUpdate) onAvatarUpdate(res.data.avatar);
            setMsg('Profile saved!');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg('Error saving profile');
        }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPwdMsg('New passwords do not match');
            return;
        }
        try {
            await api.put('/auth/change-password', { currentPassword, newPassword });
            setPwdMsg('Password updated successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPwdMsg(err.response?.data?.error || 'Failed to update password');
        }
    };

    if (loading) return <div className="loader"></div>;

    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(" ")
            .map(w => w.charAt(0).toUpperCase())
            .join("")
            .substring(0, 2);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>User Profile</h2>
            
            <div className="card" style={{ textAlign: 'center' }}>
                <label htmlFor="avatar-input" style={{ cursor: "pointer" }}>
                    <div className="avatar-circle">
                        {avatarPreview ? (
                            <img 
                                src={avatarPreview} 
                                alt="avatar"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "50%"
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: "28px", fontWeight: 700 }}>
                                {getInitials(profile.name)}
                            </span>
                        )}
                    </div>
                </label>
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    id="avatar-input"
                    onChange={handleAvatarChange}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', display: 'block' }}>Click avatar to change</span>

                {msg && <div style={{ color: 'var(--green)', marginTop: 10 }}>{msg}</div>}

                <div style={{ marginTop: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>Name</label>
                    <input 
                        type="text" 
                        value={profile.name || ''} 
                        onChange={e => setProfile({...profile, name: e.target.value})} 
                    />

                    <label style={{ display: 'block', marginBottom: 5 }}>Email (Read Only)</label>
                    <input type="email" value={profile.email || ''} disabled style={{ opacity: 0.6 }} />

                    <label style={{ display: 'block', marginBottom: 5 }}>Bio</label>
                    <textarea 
                        rows={3} 
                        value={profile.bio || ''} 
                        onChange={e => setProfile({...profile, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                    />

                    <button className="primary full-width" onClick={saveProfile}>Save Profile</button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>Change Password</h3>
                {pwdMsg && <div style={{ color: pwdMsg.includes('success') ? 'var(--green)' : 'var(--red)', marginBottom: 15 }}>{pwdMsg}</div>}
                <form onSubmit={changePassword}>
                    <div style={{ position: "relative" }}>
                        <input 
                            type={showCurrent ? "text" : "password"} 
                            placeholder="Current Password" 
                            value={currentPassword} 
                            onChange={e => setCurrentPassword(e.target.value)} 
                            style={{ paddingRight: "42px" }}
                            required 
                        />
                        <span onClick={() => setShowCurrent(!showCurrent)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "18px", userSelect: "none", color: "var(--text2)" }}>
                            {showCurrent ? "🙈" : "👁️"}
                        </span>
                    </div>
                    <div style={{ position: "relative" }}>
                        <input 
                            type={showNew ? "text" : "password"} 
                            placeholder="New Password" 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            style={{ paddingRight: "42px" }}
                            required 
                        />
                        <span onClick={() => setShowNew(!showNew)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "18px", userSelect: "none", color: "var(--text2)" }}>
                            {showNew ? "🙈" : "👁️"}
                        </span>
                    </div>
                    <div style={{ position: "relative" }}>
                        <input 
                            type={showConfirm ? "text" : "password"} 
                            placeholder="Confirm New Password" 
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            style={{ paddingRight: "42px" }}
                            required 
                        />
                        <span onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: "18px", userSelect: "none", color: "var(--text2)" }}>
                            {showConfirm ? "🙈" : "👁️"}
                        </span>
                    </div>
                    <button type="submit" className="secondary full-width">Update Password</button>
                </form>
            </div>
        </div>
    );
}

export default ProfilePage;
