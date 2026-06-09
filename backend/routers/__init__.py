# backend/routers/__init__.py
from . import auth
from . import cases
from . import all_routers
from . import chatbot
from . import firms

__all__ = ['auth', 'cases', 'all_routers', 'chatbot', 'firms']
