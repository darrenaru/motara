from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection
import os
import time
import uuid
import bcrypt

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    password: str
    nama_lengkap: str
    email: str
    role: str
    status: str = 'aktif'

class UserUpdate(BaseModel):
    id: int
    username: str
    nama_lengkap: str
    email: str
    role: str
    status: str

class PasswordUpdate(BaseModel):
    id: int
    new_password: str

class DeleteRequest(BaseModel):
    id: int

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "profiles")

@router.get("/")
def read_users(role: Optional[str] = None):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            sql = "SELECT id, username, nama_lengkap, email, foto_profil, role, status, tanggal_dibuat FROM users"
            params = []
            if role:
                sql += " WHERE role = %s"
                params.append(role)
            sql += " ORDER BY nama_lengkap ASC"
            
            cur.execute(sql, tuple(params))
            users = cur.fetchall()
            for u in users:
                if not u['foto_profil']:
                    u['foto_profil'] = 'default-avatar.png'
            return {"success": True, "message": "Data berhasil diambil", "data": users}
    finally:
        conn.close()

@router.get("/{id}")
def read_single_user(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, nama_lengkap, email, foto_profil, role, status, tanggal_dibuat FROM users WHERE id = %s", (id,))
            user = cur.fetchone()
            if user:
                if not user['foto_profil']:
                    user['foto_profil'] = 'default-avatar.png'
                return {"success": True, "message": "Data berhasil diambil", "data": user}
            return {"success": False, "message": "Data tidak ditemukan", "data": None}
    finally:
        conn.close()

@router.get("/staff/active")
def get_staff():
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nama_lengkap, email, foto_profil FROM users WHERE role = 'staff' AND status = 'aktif' ORDER BY nama_lengkap ASC")
            staff = cur.fetchall()
            for s in staff:
                if not s['foto_profil']:
                    s['foto_profil'] = 'default-avatar.png'
            return {"success": True, "message": "Data berhasil diambil", "data": staff}
    finally:
        conn.close()

@router.get("/{id}/foto")
def get_foto(id: int):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT foto_profil FROM users WHERE id = %s", (id,))
            user = cur.fetchone()
            if user:
                foto = user['foto_profil'] or 'default-avatar.png'
                if not os.path.exists(os.path.join(UPLOAD_DIR, foto)):
                    foto = 'default-avatar.png'
                return {"success": True, "message": "Foto berhasil diambil", "data": {"foto_profil": foto}}
            return {"success": False, "message": "User tidak ditemukan", "data": None}
    finally:
        conn.close()

@router.post("/")
def create_user(user: UserCreate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username = %s", (user.username,))
            if cur.fetchone():
                return {"success": False, "message": "Username sudah digunakan", "data": None}
            
            cur.execute("SELECT id FROM users WHERE email = %s", (user.email,))
            if cur.fetchone():
                return {"success": False, "message": "Email sudah digunakan", "data": None}
            
            # Using bcrypt library to hash. FastAPI generates standard $2b$ which we will just store as is.
            # Next time login checks, we replace $2y$ (if any from old PHP) to $2b$. New ones will be $2b$ already.
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(user.password.encode('utf-8'), salt).decode('utf-8')
            
            cur.execute("""
                INSERT INTO users (username, password, nama_lengkap, email, role, status) 
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (user.username, hashed, user.nama_lengkap, user.email, user.role, user.status))
            
            new_id = cur.fetchone()['id']
            conn.commit()
            return {"success": True, "message": "User berhasil ditambahkan", "data": {"id": new_id}}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Gagal menambahkan user: {str(e)}", "data": None}
    finally:
        conn.close()

@router.post("/upload_foto")
async def upload_foto(id: int = Form(...), foto_profil: UploadFile = File(...)):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        ext = foto_profil.filename.split('.')[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'gif']:
            return {"success": False, "message": "Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau GIF.", "data": None}
            
        # File size check is usually handled by fastapi automatically, but let's assume it's small enough or we check later
        
        filename = f"profile_{id}_{int(time.time())}.{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        # Delete old photo
        with conn.cursor() as cur:
            cur.execute("SELECT foto_profil FROM users WHERE id = %s", (id,))
            user = cur.fetchone()
            if user and user['foto_profil'] and user['foto_profil'] != 'default-avatar.png':
                old_path = os.path.join(UPLOAD_DIR, user['foto_profil'])
                if os.path.exists(old_path):
                    os.remove(old_path)
            
            # Save new file
            with open(filepath, "wb") as buffer:
                buffer.write(await foto_profil.read())
            
            cur.execute("UPDATE users SET foto_profil = %s WHERE id = %s", (filename, id))
            conn.commit()
            
            return {"success": True, "message": "Foto profil berhasil diupload", "data": {"foto_profil": filename}}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.put("/")
def update_user(user: UserUpdate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE username = %s AND id != %s", (user.username, user.id))
            if cur.fetchone():
                return {"success": False, "message": "Username sudah digunakan", "data": None}
            
            cur.execute("SELECT id FROM users WHERE email = %s AND id != %s", (user.email, user.id))
            if cur.fetchone():
                return {"success": False, "message": "Email sudah digunakan", "data": None}
            
            cur.execute("""
                UPDATE users SET 
                username = %s, nama_lengkap = %s, email = %s, role = %s, status = %s 
                WHERE id = %s
            """, (user.username, user.nama_lengkap, user.email, user.role, user.status, user.id))
            
            conn.commit()
            return {"success": True, "message": "Data berhasil diupdate", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.put("/password")
def update_password(req: PasswordUpdate):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(req.new_password.encode('utf-8'), salt).decode('utf-8')
        
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET password = %s WHERE id = %s", (hashed, req.id))
            conn.commit()
            return {"success": True, "message": "Password berhasil diupdate", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()

@router.delete("/")
def delete_user(req: DeleteRequest):
    if req.id == 1:
        return {"success": False, "message": "Admin utama tidak dapat dihapus", "data": None}
        
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT foto_profil FROM users WHERE id = %s", (req.id,))
            user = cur.fetchone()
            if user and user['foto_profil'] and user['foto_profil'] != 'default-avatar.png':
                old_path = os.path.join(UPLOAD_DIR, user['foto_profil'])
                if os.path.exists(old_path):
                    os.remove(old_path)
            
            cur.execute("DELETE FROM users WHERE id = %s", (req.id,))
            conn.commit()
            return {"success": True, "message": "User berhasil dihapus", "data": None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error: {str(e)}"}
    finally:
        conn.close()
