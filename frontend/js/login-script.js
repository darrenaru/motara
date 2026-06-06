// ================================================
// login-script.js - Enhanced Login with API
// ================================================

const API_URL = 'http://localhost:8000/api/auth';

// Get form elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Handle form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Reset error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Simple validation
    let hasError = false;

    if (username === '') {
        showError('usernameError', 'Username tidak boleh kosong');
        hasError = true;
    }

    if (password === '') {
        showError('passwordError', 'Password tidak boleh kosong');
        hasError = true;
    }

    if (!hasError) {
        try {
            // Disable button saat proses login
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';
            
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Simpan data user ke localStorage
                localStorage.setItem('user', JSON.stringify(result.data.user));
                
                alert(`Selamat datang, ${result.data.user.nama_lengkap}!\nRole: ${result.data.user.role.toUpperCase()}`);
                
                // Redirect berdasarkan role
                window.location.href = result.data.redirect;
            } else {
                showError('passwordError', result.message);
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Error:', error);
            showError('passwordError', 'Terjadi kesalahan. Silakan coba lagi.');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Masuk';
        }
    }
});

// Function to show error message
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

// Handle forgot password link
forgotPasswordLink.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Silakan hubungi administrator untuk mereset password Anda.\n\nEmail: admin@motara.com');
});

// Add input event listeners to clear errors when user starts typing
usernameInput.addEventListener('input', function() {
    document.getElementById('usernameError').style.display = 'none';
});

passwordInput.addEventListener('input', function() {
    document.getElementById('passwordError').style.display = 'none';
});

// Check if already logged in
window.addEventListener('DOMContentLoaded', async function() {
    const user = localStorage.getItem('user');
    
    if (user) {
        try {
            const response = await fetch(`${API_URL}/check`);
            const result = await response.json();
            
            if (result.success) {
                // User masih logged in, redirect ke halaman sesuai role
                const userData = JSON.parse(user);
                let redirectUrl = 'index.html'; // Default
                
                if (userData.role === 'admin') {
                    redirectUrl = 'index.html';
                } else if (userData.role === 'staff') {
                    redirectUrl = 'dashboard-staff.html';
                } else if (userData.role === 'kepala_instalasi') {
                    redirectUrl = 'dashboard-kepala-instalasi.html';
                }
                
                window.location.href = redirectUrl;
            } else {
                // Session expired, clear localStorage
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error('Error checking session:', error);
        }
    }
});