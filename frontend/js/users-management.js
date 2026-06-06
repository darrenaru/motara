// ================================================
// users-management.js (Updated dengan Kepala Instalasi)
// ================================================

const API_URL = 'http://localhost:8000/api/users';

let usersData = [];
let editingId = null;
let currentFilter = 'all';

// ================================================
// Load data users
// ================================================
async function loadData() {
    try {
        const response = await fetch(`${API_URL}`);
        const result = await response.json();
        
        if (result.success) {
            usersData = result.data;
            renderTable(currentFilter, document.getElementById('searchInput').value);
        } else {
            console.error('Error loading data:', result.message);
            alert('Gagal memuat data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memuat data');
    }
}

// ================================================
// Render tabel
// ================================================
function renderTable(filter = 'all', searchTerm = '') {
    const tbody = document.getElementById('tableBody');
    let filteredData = usersData;

    // Filter berdasarkan role
    if (filter !== 'all') {
        filteredData = filteredData.filter(user => user.role === filter);
    }

    // Filter berdasarkan pencarian
    if (searchTerm) {
        filteredData = filteredData.filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Jika tidak ada data
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <p>Tidak ada data user ditemukan</p>
                </td>
            </tr>
        `;
        return;
    }

    // Render data
    tbody.innerHTML = filteredData.map(user => {
        let roleLabel = user.role.toUpperCase();
        if (user.role === 'kepala_instalasi') {
            roleLabel = 'KEPALA INSTALASI';
        }
        
        return `
            <tr>
                <td>${user.username}</td>
                <td>${user.nama_lengkap}</td>
                <td>${user.email}</td>
                <td><span class="badge-role ${user.role}">${roleLabel}</span></td>
                <td><span class="badge-status ${user.status}">${user.status}</span></td>
                <td>
                    <button class="action-btn edit-btn" onclick="editUser(${user.id})">Edit</button>
                    ${user.id !== 1 ? `<button class="action-btn delete-btn" onclick="deleteUser(${user.id})">Hapus</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// ================================================
// Open modal
// ================================================
function openModal(id = null) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('userForm');
    const passwordGroup = document.getElementById('passwordGroup');
    const passwordInput = document.getElementById('password');

    if (id) {
        // Mode edit
        const user = usersData.find(u => u.id === id);
        modalTitle.textContent = 'Ubah Pengguna';
        document.getElementById('username').value = user.username;
        document.getElementById('namaLengkap').value = user.nama_lengkap;
        document.getElementById('email').value = user.email;
        document.getElementById('role').value = user.role;
        document.getElementById('status').value = user.status;
        
        // Password tidak wajib saat edit
        passwordGroup.style.display = 'none';
        passwordInput.required = false;
        
        editingId = id;
    } else {
        // Mode tambah
        modalTitle.textContent = 'Tambah Pengguna Baru';
        form.reset();
        
        // Password wajib saat tambah
        passwordGroup.style.display = 'block';
        passwordInput.required = true;
        
        editingId = null;
    }

    modal.classList.add('show');
}

// ================================================
// Close modal
// ================================================
function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    editingId = null;
}

// ================================================
// Edit user
// ================================================
function editUser(id) {
    openModal(id);
}

// ================================================
// Delete user
// ================================================
async function deleteUser(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: id })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Data berhasil dihapus');
            loadData();
        } else {
            alert('Gagal menghapus data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menghapus data');
    }
}

// ================================================
// Filter role
// ================================================
function filterRole(role) {
    currentFilter = role;
    const btn = document.getElementById('roleBtn');
    
    let btnText = 'Semua Peran';
    if (role === 'admin') {
        btnText = 'ADMIN';
    } else if (role === 'staff') {
        btnText = 'STAFF';
    } else if (role === 'kepala_instalasi') {
        btnText = 'KEPALA INSTALASI';
    }
    
    btn.innerHTML = `<span>${btnText}</span> <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
    renderTable(role, document.getElementById('searchInput').value);
    document.getElementById('roleDropdown').classList.remove('show');
}

// ================================================
// Event listener untuk form submit
// ================================================
document.getElementById('userForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const namaLengkap = document.getElementById('namaLengkap').value;
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;
    const status = document.getElementById('status').value;

    try {
        let response;
        
        if (editingId) {
            // Update data existing
            response = await fetch(`${API_URL}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: editingId,
                    username: username,
                    nama_lengkap: namaLengkap,
                    email: email,
                    role: role,
                    status: status
                })
            });
        } else {
            // Tambah data baru
            if (password.length < 6) {
                alert('Password minimal 6 karakter');
                return;
            }
            
            response = await fetch(`${API_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    nama_lengkap: namaLengkap,
                    email: email,
                    role: role,
                    status: status
                })
            });
        }

        const result = await response.json();
        
        if (result.success) {
            alert(editingId ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan');
            closeModal();
            loadData();
        } else {
            alert('Gagal menyimpan data: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menyimpan data');
    }
});

// ================================================
// Event listener untuk pencarian
// ================================================
document.getElementById('searchInput').addEventListener('input', function(e) {
    renderTable(currentFilter, e.target.value);
});

// ================================================
// Event listener untuk dropdown role
// ================================================
document.getElementById('roleBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('roleDropdown');
    dropdown.classList.toggle('show');
});

// ================================================
// Tutup dropdown jika klik di luar
// ================================================
document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        const dropdown = document.getElementById('roleDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

// ================================================
// Tutup modal jika klik di luar modal content
// ================================================
const modal = document.getElementById('modal');
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        closeModal();
    }
});

// ================================================
// Load data saat halaman dimuat
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});