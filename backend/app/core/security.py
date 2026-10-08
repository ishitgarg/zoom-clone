"""Password hashing and session tokens, using only the Python standard library.

Passwords: PBKDF2-HMAC-SHA256 with a random per-password salt, stored as
    pbkdf2_sha256$<iterations>$<salt hex>$<hash hex>
Session tokens: random URL-safe strings; only their SHA-256 hash is stored, so a leaked
database doesn't leak usable tokens.
"""

import hashlib
import hmac
import secrets

PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 310_000
SALT_BYTES = 16


def hash_password(password: str, iterations: int = PASSWORD_ITERATIONS) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"{PASSWORD_ALGORITHM}${iterations}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False
    try:
        algorithm, iterations, salt_hex, digest_hex = stored.split("$")
        if algorithm != PASSWORD_ALGORITHM:
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations))
    except ValueError:
        return False
    return hmac.compare_digest(digest.hex(), digest_hex)


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
