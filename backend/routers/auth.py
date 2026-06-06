from fastapi import APIRouter, Request
from pydantic import BaseModel
from database import get_db_connection
import bcrypt

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(login_data: LoginRequest, request: Request):
    conn = get_db_connection()
    if not conn:
        return {"success": False, "message": "Database connection failed", "data": None}
    
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE username = %s AND status = 'aktif'", (login_data.username,))
            user = cur.fetchone()
            
            if not user:
                return {"success": False, "message": "Username tidak ditemukan atau akun tidak aktif", "data": None}
            
            hashed_pw = user['password'].replace("$2y$", "$2b$")
            
            if not bcrypt.checkpw(login_data.password.encode('utf-8'), hashed_pw.encode('utf-8')):
                return {"success": False, "message": "Password salah", "data": None}
            
            request.session["user_id"] = user['id']
            request.session["username"] = user['username']
            request.session["nama_lengkap"] = user['nama_lengkap']
            request.session["email"] = user['email']
            request.session["role"] = user['role']
            request.session["logged_in"] = True
            
            redirect_url = "index.html"
            if user['role'] == "staff":
                redirect_url = "dashboard-staff.html"
            elif user['role'] == "kepala_instalasi":
                redirect_url = "dashboard-kepala-instalasi.html"
                
            return {
                "success": True,
                "message": "Login berhasil",
                "data": {
                    "user": {
                        "id": user['id'],
                        "username": user['username'],
                        "nama_lengkap": user['nama_lengkap'],
                        "email": user['email'],
                        "role": user['role']
                    },
                    "redirect": redirect_url
                }
            }
    finally:
        conn.close()

@router.get("/check")
def check_login(request: Request):
    if request.session.get("logged_in"):
        return {
            "success": True,
            "message": "User logged in",
            "data": {
                "user": {
                    "id": request.session.get("user_id"),
                    "username": request.session.get("username"),
                    "nama_lengkap": request.session.get("nama_lengkap"),
                    "email": request.session.get("email"),
                    "role": request.session.get("role")
                }
            }
        }
    else:
        return {"success": False, "message": "User not logged in", "data": None}

@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"success": True, "message": "Logout berhasil", "data": None}
