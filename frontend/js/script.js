// Get form elements
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');

// Handle form submission
loginForm.addEventListener('submit', function(e) {
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
        // Simulate login process
        console.log('Login attempt:', { username, password });
        alert('Login berhasil!\n\nUsername: ' + username);
        
        // Here you would typically send the credentials to your server
        // Example:
        // fetch('/api/login', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ username, password })
        // })
        // .then(response => response.json())
        // .then(data => {
        //     if (data.success) {
        //         window.location.href = '/dashboard';
        //     } else {
        //         showError('passwordError', 'Username atau password salah');
        //     }
        // })
        // .catch(error => {
        //     console.error('Error:', error);
        //     alert('Terjadi kesalahan. Silakan coba lagi.');
        // });
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
    alert('Silakan hubungi administrator untuk mereset password Anda.');
});

// Add input event listeners to clear errors when user starts typing
usernameInput.addEventListener('input', function() {
    document.getElementById('usernameError').style.display = 'none';
});

passwordInput.addEventListener('input', function() {
    document.getElementById('passwordError').style.display = 'none';
});