"""Authentication package.

Consumers should import directly from submodules to avoid eager loading
of DB-dependent modules (e.g. middleware importing db.config):

    from src.auth.security import Security, SECRET_KEY, ALGORITHM
    from src.auth.middleware import LoadUserData
    from src.auth.dependencies import get_current_user
"""
