import React, { useState } from 'react';
import api from '../api';

function Login({ setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('driftlog_token', res.data.token);
            setUser(res.data.user);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="error-text">{error}</div>}
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
                    name="password"
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
            <button type="submit" className="full-width">Login</button>
        </form>
    );
}

export default Login;
