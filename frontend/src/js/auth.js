import authApi from './api/authApi.js';

// ============ DOM ELEMENTS ============
const toastContainer = document.getElementById('toastContainer');
const formError = document.getElementById('formError');

// ============ TOAST FUNCTION ============
function showToast(message, type = 'success') {
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============ LOGIN FUNCTIONALITY ============
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    // Check if already logged in
    if (authApi.isAuthenticated()) {
        const user = authApi.getCurrentUser();
        if (user) {
            const dashboard = authApi.getDashboardUrl(user.role);
            window.location.href = dashboard;
            return;
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (formError) {
            formError.classList.remove('show');
            formError.textContent = '';
        }

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showToast('Please enter email and password', 'error');
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;

        try {
            console.log('Attempting login for:', email);
            const response = await authApi.login(email, password);
            console.log('Login response:', response);

            if (response.success && response.data) {
                // Save auth data
                authApi.saveAuth(response.data.token, response.data.user);
                
                showToast(response.message || 'Login successful! 🎉', 'success');
                
                // Redirect after delay
                setTimeout(() => {
                    const dashboard = authApi.getDashboardUrl(response.data.user.role);
                    console.log('Redirecting to:', dashboard);
                    window.location.href = dashboard;
                }, 1000);
            } else {
                const errorMsg = response.message || 'Login failed. Please try again.';
                showToast(errorMsg, 'error');
                if (formError) {
                    formError.textContent = errorMsg;
                    formError.classList.add('show');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ============ REGISTER FUNCTIONALITY ============
const registerForm = document.getElementById('registerForm');

if (registerForm) {
    let selectedRole = 'DONOR';

    // Role selection
    const roleBtns = document.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            roleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedRole = btn.dataset.role;

            // Show/hide role fields
            const roleFields = {
                'DONOR': 'donorFields',
                'HOSPITAL': 'hospitalFields',
                'BLOOD_BANK': 'bloodBankFields'
            };

            document.querySelectorAll('.role-fields').forEach(el => {
                el.classList.remove('active');
            });

            const targetField = document.getElementById(roleFields[selectedRole]);
            if (targetField) {
                targetField.classList.add('active');
            }
        });
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (formError) {
            formError.classList.remove('show');
            formError.textContent = '';
        }

        // Get common fields
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const phone = document.getElementById('phone').value.trim();

        if (!name || !email || !password || !phone) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        const userData = {
            name,
            email,
            password,
            phone,
            role: selectedRole
        };

        // Add role-specific fields
        if (selectedRole === 'DONOR') {
            const age = document.getElementById('age').value;
            const gender = document.getElementById('gender').value;
            const bloodType = document.getElementById('bloodType').value;
            const address = document.getElementById('address').value.trim();
            const city = document.getElementById('city').value.trim();

            if (!age || !gender || !bloodType || !address || !city) {
                showToast('Please fill in all donor fields', 'error');
                return;
            }

            Object.assign(userData, {
                age: parseInt(age),
                gender,
                bloodType,
                address,
                city
            });
        } else if (selectedRole === 'HOSPITAL') {
            const hospitalName = document.getElementById('hospitalName').value.trim();
            const licenseNumber = document.getElementById('hospitalLicense').value.trim();
            const address = document.getElementById('hospitalAddress').value.trim();
            const city = document.getElementById('hospitalCity').value.trim();

            if (!hospitalName || !licenseNumber || !address || !city) {
                showToast('Please fill in all hospital fields', 'error');
                return;
            }

            Object.assign(userData, {
                hospitalName,
                licenseNumber,
                address,
                city
            });
        } else if (selectedRole === 'BLOOD_BANK') {
            const bankName = document.getElementById('bankName').value.trim();
            const licenseNumber = document.getElementById('bankLicense').value.trim();
            const address = document.getElementById('bankAddress').value.trim();
            const city = document.getElementById('bankCity').value.trim();

            if (!bankName || !licenseNumber || !address || !city) {
                showToast('Please fill in all blood bank fields', 'error');
                return;
            }

            Object.assign(userData, {
                bankName,
                licenseNumber,
                address,
                city
            });
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
        submitBtn.disabled = true;

        try {
            console.log('Registering user:', userData);
            const response = await authApi.register(userData);
            console.log('Registration response:', response);

            if (response.success && response.data) {
                authApi.saveAuth(response.data.token, response.data.user);
                showToast(response.message || 'Registration successful! 🎉', 'success');
                
                setTimeout(() => {
                    const dashboard = authApi.getDashboardUrl(response.data.user.role);
                    console.log('Redirecting to:', dashboard);
                    window.location.href = dashboard;
                }, 1500);
            } else {
                let errorMsg = response.message || 'Registration failed';
                if (response.errors && response.errors.length > 0) {
                    errorMsg = response.errors.map(e => e.msg).join(', ');
                }
                showToast(errorMsg, 'error');
                if (formError) {
                    formError.textContent = errorMsg;
                    formError.classList.add('show');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            showToast('Registration failed: ' + (error.message || 'Please try again.'), 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ============ LOGOUT FUNCTIONALITY ============
document.querySelectorAll('.logout-btn, #logoutBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await authApi.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            authApi.clearAuth();
            showToast('Logged out successfully!', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        }
    });
});