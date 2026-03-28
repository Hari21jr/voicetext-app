import os
import sqlite3
import uuid
import tempfile
from functools import wraps

from flask import Flask, request, jsonify, session, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from groq import Groq

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "super-secret-key-change-me")
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"] = True

CORS(app, supports_credentials=True, origins=["http://localhost:3000"])

DATABASE = os.environ.get("DATABASE_URL", "sqlite:///data/app.db").replace("sqlite:///", "")

# ── Database helpers ──────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        os.makedirs(os.path.dirname(DATABASE) if os.path.dirname(DATABASE) else ".", exist_ok=True)
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            share_id TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    db.commit()
    db.close()


# ── Auth decorator ────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Auth routes ───────────────────────────────────────────────────────────────

@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = get_db()
    if db.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone():
        return jsonify({"error": "Username already taken"}), 409

    password_hash = generate_password_hash(password)
    cursor = db.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, password_hash),
    )
    db.commit()

    session["user_id"] = cursor.lastrowid
    session["username"] = username
    return jsonify({"id": cursor.lastrowid, "username": username}), 201


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"id": user["id"], "username": user["username"]})


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.route("/auth/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify(None), 200
    return jsonify({"id": session["user_id"], "username": session["username"]})


# ── Speech-to-Text ────────────────────────────────────────────────────────────

@app.route("/stt/transcribe", methods=["POST"])
@login_required
def transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY not configured"}), 500

    suffix = ".webm"
    content_type = audio_file.content_type or ""
    if "wav" in content_type:
        suffix = ".wav"
    elif "mp3" in content_type or "mpeg" in content_type:
        suffix = ".mp3"
    elif "mp4" in content_type or "m4a" in content_type:
        suffix = ".m4a"
    elif "ogg" in content_type:
        suffix = ".ogg"

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
            audio_file.save(tmp.name)
            tmp.flush()

            client = Groq(api_key=api_key)
            with open(tmp.name, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    file=(tmp.name, f.read()),
                    model="whisper-large-v3-turbo",
                    response_format="verbose_json",
                )

        text = transcription.text
        return jsonify({"text": text, "duration": getattr(transcription, "duration", None)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── History ───────────────────────────────────────────────────────────────────

@app.route("/history", methods=["GET"])
@login_required
def get_history():
    db = get_db()
    rows = db.execute(
        "SELECT id, type, title, content, share_id, created_at FROM history WHERE user_id = ? ORDER BY created_at DESC",
        (session["user_id"],),
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/history", methods=["POST"])
@login_required
def save_history():
    data = request.get_json()
    item_type = data.get("type")
    content = data.get("content", "")
    title = data.get("title", "")

    if not item_type or not content:
        return jsonify({"error": "type and content are required"}), 400

    item_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO history (id, user_id, type, title, content) VALUES (?, ?, ?, ?, ?)",
        (item_id, session["user_id"], item_type, title, content),
    )
    db.commit()
    return jsonify({"id": item_id, "type": item_type, "title": title, "content": content}), 201


@app.route("/history/<item_id>", methods=["DELETE"])
@login_required
def delete_history(item_id):
    db = get_db()
    db.execute("DELETE FROM history WHERE id = ? AND user_id = ?", (item_id, session["user_id"]))
    db.commit()
    return jsonify({"message": "Deleted"})


# ── Share ─────────────────────────────────────────────────────────────────────

@app.route("/share", methods=["POST"])
@login_required
def create_share():
    data = request.get_json()
    item_id = data.get("item_id")
    if not item_id:
        return jsonify({"error": "item_id is required"}), 400

    db = get_db()
    item = db.execute(
        "SELECT * FROM history WHERE id = ? AND user_id = ?",
        (item_id, session["user_id"]),
    ).fetchone()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    if item["share_id"]:
        return jsonify({"share_id": item["share_id"]})

    share_id = str(uuid.uuid4())[:8]
    db.execute("UPDATE history SET share_id = ? WHERE id = ?", (share_id, item_id))
    db.commit()
    return jsonify({"share_id": share_id})


@app.route("/share/<share_id>", methods=["GET"])
def get_shared(share_id):
    db = get_db()
    item = db.execute(
        "SELECT type, title, content, created_at FROM history WHERE share_id = ?",
        (share_id,),
    ).fetchone()
    if not item:
        return jsonify({"error": "Not found"}), 404
    return jsonify(dict(item))


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(os.path.dirname(DATABASE) if os.path.dirname(DATABASE) else ".", exist_ok=True)
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
