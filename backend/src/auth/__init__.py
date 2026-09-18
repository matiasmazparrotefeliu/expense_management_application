"""Authentication package.

Consumers should import directly from submodules to avoid eager loading
of DB-dependent modules (e.g. middleware importing db.config):

    from .security import Security, SECRET_KEY, ALGORITHM
    from .middleware import LoadUserData
    from .dependencies import get_current_user
"""
