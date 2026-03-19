import React, { useState } from 'react';
import api from '../api';

function Register({ onRegister }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/auth/register', { name, email, password });
            onRegister();
        } catch (err) {
            console.error("Register error:", err.response?.data);
            setError(
                err.response?.data?.message || 
                err.response?.data || 
                err.message || 
                "Server error"
            );
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="error-text">{error}</div>}
            <input 
                type="text" 
                placeholder="Name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
            />
            <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
            />
            <div style={{ position: "relative" }}>
                <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{ paddingRight: "42px" }}
                    required 
                />
                <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        fontSize: "18px",
                        userSelect: "none",
                        color: "var(--text2)"
                    }}
                >
                    {showPassword ? "🙈" : "👁️"}
                </span>
            </div>
            <button type="submit" className="full-width success">Register</button>
        </form>
    );
}

export default Register;
