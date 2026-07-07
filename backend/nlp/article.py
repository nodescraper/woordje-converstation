"""
Fetch and extract the main text of a web article (news, blog) so a conversation
can be grounded in it. Uses Trafilatura, which consistently tops content-
extraction benchmarks and strips nav/ads/footers on its own.

Degrades gracefully: if trafilatura isn't installed, ARTICLE_OK is False and the
route returns a clear message.
"""
try:
    import trafilatura
    ARTICLE_OK = True
except Exception:
    trafilatura = None
    ARTICLE_OK = False

# keep the context sent to the model bounded (tokens cost + focus)
MAX_ARTICLE_CHARS = 6000


def fetch_article(url):
    """Return {title, text, url}. Raises on network errors; returns empty text
    if nothing extractable was found."""
    if not ARTICLE_OK:
        raise RuntimeError("trafilatura is not installed. Run: pip install trafilatura")
    downloaded = trafilatura.fetch_url(url)
    if not downloaded:
        return {"title": "", "text": "", "url": url}
    # bare_extraction gives us metadata (title) + main text together
    data = trafilatura.bare_extraction(
        downloaded, include_comments=False, include_tables=False,
        with_metadata=True, url=url)
    title, text = "", ""
    if isinstance(data, dict):
        title = (data.get("title") or "").strip()
        text = (data.get("text") or "").strip()
    if not text:  # fallback to the plain extract() path
        text = (trafilatura.extract(downloaded, include_comments=False,
                                    include_tables=False) or "").strip()
    if len(text) > MAX_ARTICLE_CHARS:
        text = text[:MAX_ARTICLE_CHARS].rsplit(" ", 1)[0] + " …"
    print(f"[ARTICLE] {url}  title={title[:60]!r}  chars={len(text)}", flush=True)
    return {"title": title, "text": text, "url": url}
