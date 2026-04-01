import os
from datetime import datetime, timezone
from urllib.parse import quote_plus

import certifi
from flask import Flask, jsonify, render_template, request
from pymongo import DESCENDING, ASCENDING, MongoClient
from pymongo.errors import PyMongoError

app = Flask(__name__)

_MONGO_URI_TEMPLATE = "mongodb://sboyd1501_db_user:{password}@ac-lmkibw5-shard-00-00.03biqou.mongodb.net:27017,ac-lmkibw5-shard-00-01.03biqou.mongodb.net:27017,ac-lmkibw5-shard-00-02.03biqou.mongodb.net:27017/?ssl=true&replicaSet=atlas-xdyjxl-shard-0&authSource=admin&appName=Cluster0"
_mongo_client = None
_scores_collection = None


def _build_mongo_uri():
    mongo_uri = os.environ.get("MONGODB_URI")
    if mongo_uri:
        return mongo_uri
    db_pass = os.environ.get("db_pass") or os.environ.get("DB_PASS")
    if not db_pass:
        raise RuntimeError("Missing MongoDB credentials. Set MONGODB_URI or db_pass.")
    return _MONGO_URI_TEMPLATE.format(password=quote_plus(db_pass))


def _is_debug_enabled():
    return os.environ.get("FLASK_DEBUG", "0") == "1"


def _database_error_response(exc):
    if _is_debug_enabled():
        return jsonify({"error": f"Database unavailable: {exc}"}), 500
    return jsonify({"error": "Database unavailable. Check MongoDB URI, Atlas network access, and TLS settings."}), 500


def _get_scores_collection():
    global _mongo_client
    global _scores_collection

    if _scores_collection is not None:
        return _scores_collection

    insecure_tls = os.environ.get("MONGO_TLS_INSECURE", "0") == "1"
    _mongo_client = MongoClient(
        _build_mongo_uri(),
        serverSelectionTimeoutMS=10000,
        connectTimeoutMS=10000,
        socketTimeoutMS=10000,
        tls=True,
        tlsCAFile=certifi.where(),
        tlsAllowInvalidCertificates=insecure_tls,
        tlsAllowInvalidHostnames=insecure_tls,
    )
    _mongo_client.admin.command("ping")
    db = _mongo_client["chibirun"]
    _scores_collection = db["leaderboard_scores"]
    _scores_collection.create_index([("score", DESCENDING), ("created_at", ASCENDING)])
    _scores_collection.create_index([("created_at", DESCENDING)])
    return _scores_collection


def _parse_limit():
    try:
        limit = int(request.args.get("limit", 10))
    except ValueError:
        return None, (jsonify({"error": "limit must be an integer"}), 400)
    return max(1, min(limit, 100)), None


def _serialize_entry(doc):
    created_at = doc.get("created_at")
    return {
        "player": doc.get("player", "Unknown"),
        "score": int(doc.get("score", 0)),
        "character": doc.get("character", ""),
        "created_at": created_at.isoformat() if created_at else None,
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/leaderboard")
def leaderboard_page():
    return render_template("leaderboard.html")


@app.route("/api/health/db", methods=["GET"])
def db_health():
    try:
        _get_scores_collection()
        return jsonify({"ok": True, "message": "MongoDB connection healthy"}), 200
    except (RuntimeError, PyMongoError) as exc:
        return _database_error_response(exc)


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    limit, error = _parse_limit()
    if error:
        return error

    try:
        docs = (
            _get_scores_collection()
            .find({}, {"_id": 0, "player": 1, "score": 1, "character": 1, "created_at": 1})
            .sort([("score", DESCENDING), ("created_at", ASCENDING)])
            .limit(limit)
        )
        leaderboard = [_serialize_entry(doc) for doc in docs]
        return jsonify({"entries": leaderboard}), 200
    except (RuntimeError, PyMongoError) as exc:
        return _database_error_response(exc)


@app.route("/api/leaderboard/recent", methods=["GET"])
def get_recent_scores():
    limit, error = _parse_limit()
    if error:
        return error

    try:
        docs = (
            _get_scores_collection()
            .find({}, {"_id": 0, "player": 1, "score": 1, "character": 1, "created_at": 1})
            .sort([("created_at", DESCENDING)])
            .limit(limit)
        )
        recent_scores = [_serialize_entry(doc) for doc in docs]
        return jsonify({"entries": recent_scores}), 200
    except (RuntimeError, PyMongoError) as exc:
        return _database_error_response(exc)


@app.route("/api/leaderboard", methods=["POST"])
def submit_score():
    data = request.get_json(silent=True) or {}
    player = str(data.get("player", "")).strip()
    character = str(data.get("character", "")).strip()
    score = data.get("score")

    if not player or len(player) > 24:
        return jsonify({"error": "player must be 1-24 characters"}), 400
    if character and len(character) > 24:
        return jsonify({"error": "character must be <= 24 characters"}), 400

    try:
        score = int(score)
    except (TypeError, ValueError):
        return jsonify({"error": "score must be an integer"}), 400

    if score < 0:
        return jsonify({"error": "score must be >= 0"}), 400

    entry = {
        "player": player,
        "score": score,
        "character": character,
        "created_at": datetime.now(timezone.utc),
    }

    try:
        _get_scores_collection().insert_one(entry)
        return jsonify({"ok": True}), 201
    except (RuntimeError, PyMongoError) as exc:
        return _database_error_response(exc)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
