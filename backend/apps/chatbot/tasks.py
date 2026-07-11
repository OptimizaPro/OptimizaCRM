"""
Optimiza-CRM – Chatbot RAG Celery tasks
"""

import logging
import json

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def embed_knowledge_base(self, kb_id: str):
    """
    Generate or refresh KBChunk embeddings for a KnowledgeBase.
    Called after KB is saved (POST /api/v1/kb/manage/).

    Steps:
      1. Load KB
      2. Chunk each non-empty field
      3. Get OpenAI API key from org
      4. For each chunk: call text-embedding-3-small, upsert KBChunk
      5. Delete stale chunks (sections no longer present)
    """
    from apps.kb.models import KnowledgeBase, KBChunk
    from .rag_service import chunk_knowledge_base, embed_text, _get_openai_key

    try:
        kb = KnowledgeBase.objects.select_related("organization").get(id=kb_id)
    except KnowledgeBase.DoesNotExist:
        logger.error("embed_knowledge_base: KB %s not found", kb_id)
        return

    org       = kb.organization
    api_key   = _get_openai_key(org)
    if not api_key:
        logger.warning(
            "embed_knowledge_base: no OpenAI API key for org %s — chunks saved without embeddings",
            org.id,
        )

    chunks_data = chunk_knowledge_base(kb)
    seen_keys   = set()

    for chunk in chunks_data:
        section     = chunk["section"]
        chunk_index = chunk["chunk_index"]
        text        = chunk["text"]
        key         = (section, chunk_index)
        seen_keys.add(key)

        embedding_json = ""
        if api_key:
            vec = embed_text(text, api_key)
            if vec:
                embedding_json = json.dumps(vec)

        KBChunk.objects.update_or_create(
            knowledge_base=kb,
            section=section,
            chunk_index=chunk_index,
            defaults={
                "organization": org,
                "text":         text,
                "embedding":    embedding_json,
                "embedded_at":  timezone.now() if embedding_json else None,
            },
        )

    # Delete chunks no longer present (e.g. field was cleared)
    all_chunks = KBChunk.objects.filter(knowledge_base=kb)
    stale = [c.pk for c in all_chunks if (c.section, c.chunk_index) not in seen_keys]
    if stale:
        KBChunk.objects.filter(pk__in=stale).delete()

    logger.info(
        "embed_knowledge_base: KB %s — %d chunks processed, %d stale deleted",
        kb_id, len(chunks_data), len(stale),
    )
    return {"chunks": len(chunks_data), "stale_deleted": len(stale)}
