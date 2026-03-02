"""Configuration for Freeciv Agent."""

import os

# Freeciv-web server
TOMCAT_HOST = os.getenv("FREECIV_TOMCAT_HOST", "localhost")
TOMCAT_PORT = int(os.getenv("FREECIV_TOMCAT_PORT", "8080"))
NGINX_HOST = os.getenv("FREECIV_NGINX_HOST", "localhost")
NGINX_PORT = int(os.getenv("FREECIV_NGINX_PORT", "8000"))

LAUNCHER_URL = f"http://{TOMCAT_HOST}:{TOMCAT_PORT}/freeciv-web/civclientlauncher"
WS_BASE_URL = f"ws://{NGINX_HOST}:{NGINX_PORT}/civsocket"

# Freeciv protocol
FREECIV_VERSION = "+Freeciv.Web.Devel-3.3"
MAJOR_VERSION = 3
MINOR_VERSION = 1
PATCH_VERSION = 90

# LLM configuration
# Compass API (OpenAI-compatible): use "openai/<model>" with LiteLLM
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gemini-3-flash-preview")
LLM_API_KEY = os.getenv("COMPASS_API_KEY", os.getenv("LLM_API_KEY", ""))
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://compass.llm.shopee.io/compass-api/v1")

# Agent behavior
MAX_MESSAGES_KEPT = 200
TURN_TIMEOUT_SECONDS = int(os.getenv("TURN_TIMEOUT", "30"))

# Multi-agent HTTP API
API_HOST = os.getenv("FREECIV_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("FREECIV_API_PORT", "8642"))
