"""
Backend configuration — INFRASTRUCTURE ONLY.

This backend is a stateless chat-generation service. It holds NO product data:
no vocabulary, no personalities, no topics, no user settings. All of that lives
in the client (this project's frontend, or the woordje app) and is passed in
with each request. The one thing that IS server-side is the language wiring
(which spaCy model / frequency list / dictionary / grammar), because those are
Python libraries — but even the target language is chosen per request; this only
sets the default.

Everything here is model-provider wiring (URLs, keys, model names), the default
language, and server settings. API keys come from environment variables so
nothing secret is committed. See .env.example.
"""
import os
import languages

# ---- default target language --------------------------------------------
# The catalogue of supported languages lives in languages.py. This just picks
# the default when a request doesn't specify one. Override with WOORDJE_DEFAULT_LANG.
languages.DEFAULT_LANG = languages.normalize(
    os.environ.get("WOORDJE_DEFAULT_LANG", languages.DEFAULT_LANG))
DEFAULT_LANG = languages.DEFAULT_LANG

# ---- default model provider ---------------------------------------------
_DEFAULT_PROVIDER = os.environ.get("WOORDJE_DEFAULT_PROVIDER", "lmstudio")
if _DEFAULT_PROVIDER in {"lmstudio-qwen", "lmstudio-gemma"}:
    _DEFAULT_PROVIDER = "lmstudio"
PROVIDER = _DEFAULT_PROVIDER

# OpenAI-compatible providers. Add any endpoint that speaks the OpenAI chat API
# (LM Studio, Ollama, DeepSeek, Gemini's OpenAI shim, OpenRouter, ...). Keys are
# read from the environment; a blank key means "cloud provider, not configured".
PROVIDERS = {
    "lmstudio": {        # local endpoint; models are discovered live via /v1/models
        "base_url": os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1"),
        "api_key": "lm-studio",
        "model": os.environ.get("LMSTUDIO_MODEL", "qwen3.5-0.8b")},
    "deepseek": {         # cloud; set DEEPSEEK_API_KEY to enable
        "base_url": "https://api.deepseek.com",
        "api_key": os.environ.get("DEEPSEEK_API_KEY", ""),
        "model": os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")},
    "gemini-lite": {      # cloud; set GEMINI_API_KEY to enable
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "api_key": os.environ.get("GEMINI_API_KEY", ""),
        "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")},
    "openai-compatible": {  # generic slot; point it anywhere via env
        "base_url": os.environ.get("OPENAI_COMPAT_BASE_URL", "http://localhost:11434/v1"),
        "api_key": os.environ.get("OPENAI_COMPAT_API_KEY", ""),
        "model": os.environ.get("OPENAI_COMPAT_MODEL", "llama3.1")},
}

PROVIDER_LABELS = {
    "lmstudio":         "Local models",
    "deepseek":          "DeepSeek V4-Flash (cloud)",
    "gemini-lite":       "Gemini 2.5 Flash-Lite (cloud)",
    "openai-compatible": os.environ.get("OPENAI_COMPAT_LABEL", "OpenAI-compatible (custom)"),
}

# A provider is hidden from the default UI unless configured (keeps the picker
# clean). The generic slot is opt-in: only shown if a base URL/key was set.
HIDDEN_UNLESS_CONFIGURED = {"openai-compatible"}

# ---- server --------------------------------------------------------------
PORT = int(os.environ.get("PORT", "5001"))
DEBUG = os.environ.get("FLASK_DEBUG", "1") not in ("0", "false", "False")
