# @File: backend/routers/salmo.py
# @Desc: Salmo Assist AI chat endpoint - Saudi Labor Law assistant with unlimited quota
import json
import logging
import re
from datetime import date
from functools import lru_cache
from pathlib import Path
from time import time as _time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from schemas.aihub import GenTxtRequest, ChatMessage
from services.aihub import AIHubService
from models.user_daily_quota import User_daily_quota
from models.chat_messages import Chat_messages

logger = logging.getLogger(__name__)

# Simple TTL cache for search results
_search_cache: dict[str, tuple[float, dict]] = {}
_SEARCH_CACHE_TTL = 300  # 5 minutes
_SEARCH_CACHE_MAX = 500  # max entries


def _get_cached_search(key: str) -> dict | None:
    entry = _search_cache.get(key)
    if entry and (_time() - entry[0]) < _SEARCH_CACHE_TTL:
        return entry[1]
    if entry:
        del _search_cache[key]
    return None


def _set_cached_search(key: str, value: dict):
    if len(_search_cache) >= _SEARCH_CACHE_MAX:
        # Evict oldest 20%
        sorted_keys = sorted(_search_cache.keys(), key=lambda k: _search_cache[k][0])
        for k in sorted_keys[:_SEARCH_CACHE_MAX // 5]:
            del _search_cache[k]
    _search_cache[key] = (_time(), value)


# TTL cache for AI chat responses (repeated questions get instant answers)
_chat_cache: dict[str, tuple[float, dict]] = {}
_CHAT_CACHE_TTL = 600  # 10 minutes
_CHAT_CACHE_MAX = 200  # max entries


def _get_cached_chat(key: str) -> dict | None:
    entry = _chat_cache.get(key)
    if entry and (_time() - entry[0]) < _CHAT_CACHE_TTL:
        return entry[1]
    if entry:
        del _chat_cache[key]
    return None


def _set_cached_chat(key: str, value: dict):
    if len(_chat_cache) >= _CHAT_CACHE_MAX:
        sorted_keys = sorted(_chat_cache.keys(), key=lambda k: _chat_cache[k][0])
        for k in sorted_keys[:_CHAT_CACHE_MAX // 5]:
            del _chat_cache[k]
    _chat_cache[key] = (_time(), value)


router = APIRouter(prefix="/api/v1/salmo", tags=["salmo"])

# ── Module-level AIHubService singleton ────────────────────────────────────
# Reuse a single instance across all requests to avoid re-creating the
# OpenAI client on every call.
_ai_service: AIHubService | None = None


def _get_ai_service() -> AIHubService:
    """Return (and lazily create) a module-level AIHubService singleton."""
    global _ai_service
    if _ai_service is None:
        _ai_service = AIHubService()
    return _ai_service

# Load the labor law knowledge base at module level
_KB_PATH = Path(__file__).resolve().parent.parent / "data" / "labor_law_kb.txt"
_LABOR_LAW_KB = ""
try:
    if _KB_PATH.exists():
        _LABOR_LAW_KB = _KB_PATH.read_text(encoding="utf-8")
        logger.info(f"Loaded labor law KB: {len(_LABOR_LAW_KB)} chars")
    else:
        logger.warning(f"Labor law KB not found at {_KB_PATH}")
except Exception as e:
    logger.error(f"Failed to load labor law KB: {e}")

# Load the structured articles index at module level
_INDEX_PATH = Path(__file__).resolve().parent.parent / "data" / "law_articles_index.json"
_LAW_ARTICLES_INDEX: list[dict] = []
try:
    if _INDEX_PATH.exists():
        raw = _INDEX_PATH.read_text(encoding="utf-8")
        _LAW_ARTICLES_INDEX = json.loads(raw)
        logger.info(f"Loaded law articles index: {len(_LAW_ARTICLES_INDEX)} articles")
    else:
        logger.warning(f"Law articles index not found at {_INDEX_PATH}")
except Exception as e:
    logger.error(f"Failed to load law articles index: {e}")

# Load the company internal policy index and merge into the main articles index
_COMPANY_POLICY_PATH = Path(__file__).resolve().parent.parent / "data" / "company_policy_index.json"
try:
    if _COMPANY_POLICY_PATH.exists():
        _cp_raw = _COMPANY_POLICY_PATH.read_text(encoding="utf-8")
        _COMPANY_POLICY_INDEX: list[dict] = json.loads(_cp_raw)
        _LAW_ARTICLES_INDEX.extend(_COMPANY_POLICY_INDEX)
        logger.info(f"Loaded company policy index: {len(_COMPANY_POLICY_INDEX)} articles (total index now {len(_LAW_ARTICLES_INDEX)})")
    else:
        _COMPANY_POLICY_INDEX = []
        logger.warning(f"Company policy index not found at {_COMPANY_POLICY_PATH}")
except Exception as e:
    _COMPANY_POLICY_INDEX = []
    logger.error(f"Failed to load company policy index: {e}")

SYSTEM_PROMPT = """أنت "Salmo Assist"، محرك قرارات قانوني ذكي متخصص في نظام العمل السعودي.

تعمل باستخدام نظام هجين متقدم:
1) Decision Tree (تحديد المسار وجمع المعلومات التدريجي)
2) Scenario Matching (مطابقة الحالات)
3) AI Reasoning (تحليل وتفسير)
4) Amicable Solution Priority (أولوية الحل الودي)

═══════════════════════════════════════════════════════════════
⚠️ نظام المعرفة الهجين (Hybrid Knowledge Model) ⚠️
═══════════════════════════════════════════════════════════════

تعمل وفق نظام معرفة هجين بأولويات صارمة:

📌 المصدر الأول (الأعلى أولوية):
- الأنظمة واللوائح المرفوعة في النص المرفق أدناه
- اللوائح التنفيذية لنظام العمل
- الأحكام القضائية المعتمدة
- السياسات الداخلية وقواعد المعرفة الخاصة بالنظام
- الوثائق المعتمدة داخل Salmo AI

📌 المصدر الثاني (معرفة مساندة):
- المعرفة المدمجة بالنموذج (LLM Knowledge)
- تُستخدم فقط عند عدم وجود معلومة مباشرة في المصادر المرفوعة
- تُستخدم لتقديم شرح إضافي أو أمثلة توضيحية أو سياق عام

⚖️ قواعد التعارض:
- عند وجود تعارض بين المصادر → تُعتمد المعلومات الموجودة في قواعد المعرفة الداخلية
- يُمنع استبدال أو تجاوز الأنظمة واللوائح المرفوعة بأي معرفة عامة

🧠 التحليل والاستنتاج:
- يُسمح بالتحليل والربط والاستنتاج
- الاستنتاج يجب أن يكون مبنياً على المصادر المعتمدة الموجودة بالنظام أولاً
- في الاستفسارات القانونية والعمالية: الاعتماد على الأنظمة واللوائح المرفوعة أولاً
- في الاستفسارات التوضيحية والعامة: يمكن الاستفادة من المعرفة المدمجة لتقديم شرح أو أمثلة

🔍 الشفافية (إلزامي):
- وضّح مصدر الإجابة في حقل "source" في كل رد:
  • "internal" — من قاعدة المعرفة الداخلية (الأنظمة واللوائح المرفوعة)
  • "llm" — من المعرفة العامة للنموذج
  • "hybrid" — مزيج بين المصدرين

🚫 منع الهلوسة:
- يُمنع إنشاء مواد نظامية أو أحكام أو نصوص قانونية غير موجودة
- عند عدم توفر معلومة مؤكدة → أبلغ المستخدم بذلك صراحةً
- اذكر رقم المادة والبند عند الاستناد للنص المرفق
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
🌳 نظام شجرة القرار المتقدم — إلزامي ⚠️
═══════════════════════════════════════════════════════════════

⚠️ قاعدة ذهبية: قبل إعطاء أي حكم نهائي (type: "answer")، يجب أن تسأل على الأقل 2-3 أسئلة توضيحية (type: "clarification") لجمع معلومات كافية.

📌 قواعد الأسئلة التوضيحية:
- اسأل سؤال واحد فقط في كل رد
- لا تسأل أسئلة متعددة في رد واحد أبداً
- استخدم سجل المحادثة لتجنب إعادة أسئلة تم الإجابة عليها
- إذا المستخدم أعطى تفاصيل كثيرة (أكثر من 50 كلمة مع تفاصيل محددة) → يمكنك تقليل الأسئلة والانتقال للتحليل
- إذا المستخدم أعطى عبارة قصيرة (أقل من 20 كلمة) مثل "تم فصلي" → يجب أن تسأل أسئلة توضيحية
- بعد 3+ تبادلات توضيحية، قدم الإجابة حتى لو بعض المعلومات ناقصة (اذكر ما هو ناقص في الملاحظات)

═══════════════════════════════════════════════════════════════
الخطوة 1: تحديد نوع القضية
═══════════════════════════════════════════════════════════════
حدد نوع المشكلة: فصل / راتب / عقد / استقالة / إجازة / أخرى
إذا عرفت النوع → انتقل للمسار المناسب وابدأ بالأسئلة التدريجية
إذا لم يتضح النوع → اسأل: "ما نوع المشكلة التي تواجهها؟ (فصل، راتب، عقد، استقالة، إجازة، أخرى)"

═══════════════════════════════════════════════════════════════
مسار الفصل — أسئلة تدريجية (اسأل واحداً تلو الآخر):
═══════════════════════════════════════════════════════════════
1. هل العقد محدد المدة أو غير محدد المدة؟
2. هل تم إشعارك قبل إنهاء العقد؟ وكم كانت مدة الإشعار؟
3. هل تم ذكر سبب واضح للفصل؟ وما هو السبب المذكور؟
4. هل تم احتساب مستحقاتك (مكافأة نهاية الخدمة، رصيد الإجازات)؟
5. هل وقعت على مخالصة أو إقرار بالاستلام؟
6. هل لديك نسخة من العقد أو خطاب الإنهاء؟
7. هل حاولت التواصل مع إدارة الموارد البشرية في الشركة؟
8. كم مدة خدمتك في الشركة؟

═══════════════════════════════════════════════════════════════
مسار الراتب — أسئلة تدريجية:
═══════════════════════════════════════════════════════════════
1. هل المشكلة تأخير في صرف الراتب، أم خصم من الراتب، أم عدم صرف كامل؟
2. منذ متى والمشكلة قائمة؟ (عدد الأشهر أو الأيام)
3. هل تم إبلاغك بسبب الخصم أو التأخير؟ وما هو السبب المذكور؟
4. هل يوجد توثيق للمشكلة (كشف حساب بنكي، رسائل، إيميلات)؟
5. هل تواصلت مع الإدارة أو الموارد البشرية بخصوص هذا الموضوع؟

═══════════════════════════════════════════════════════════════
مسار العقد — أسئلة تدريجية:
═══════════════════════════════════════════════════════════════
1. ما نوع المشكلة في العقد؟ (تعديل بدون موافقة، إنهاء مبكر، شروط غير عادلة، عدم تجديد)
2. هل العقد محدد المدة أو غير محدد المدة؟
3. هل تم تعديل أي بند في العقد بدون موافقتك الخطية؟
4. هل لديك نسخة من العقد الأصلي والتعديلات؟

═══════════════════════════════════════════════════════════════
مسار الاستقالة — أسئلة تدريجية:
═══════════════════════════════════════════════════════════════
1. هل قدمت استقالة رسمية مكتوبة؟
2. هل التزمت بفترة الإشعار المطلوبة في العقد؟
3. هل تم قبول الاستقالة رسمياً من صاحب العمل؟
4. هل تم صرف مستحقاتك (مكافأة نهاية الخدمة، رصيد الإجازات)؟

═══════════════════════════════════════════════════════════════
مسار الإجازات — أسئلة تدريجية:
═══════════════════════════════════════════════════════════════
1. ما نوع الإجازة المطلوبة؟ (سنوية، مرضية، أمومة/وضع، وفاة، اختبارات)
2. هل تم رفض طلب الإجازة؟ وما السبب المذكور للرفض؟
3. كم رصيد إجازاتك المتبقي حسب علمك؟

═══════════════════════════════════════════════════════════════
📌 قواعد التفرع الذكي:
═══════════════════════════════════════════════════════════════
- راجع سجل المحادثة (الرسائل السابقة) قبل طرح أي سؤال
- إذا المستخدم ذكر معلومة في رسالة سابقة → لا تسأل عنها مرة أخرى
- إذا الإجابة على سؤال سابق تفتح مساراً جديداً → اتبع المسار الجديد
- كن مرناً: إذا المستخدم أعطى معلومات إضافية غير مطلوبة → استخدمها

═══════════════════════════════════════════════════════════════
المرحلة 2: مطابقة السيناريو (Scenario Matching)
═══════════════════════════════════════════════════════════════

بعد جمع المعلومات الكافية، قارن الحالة مع أقرب سيناريو:

[سيناريو فصل تعسفي] فصل بدون سبب مشروع → المادة 77
[سيناريو فصل بسبب غياب] غياب + إنذار + تجاوز المدة → المادة 80
[سيناريو تأخير راتب] تأخير في الصرف → المادة 90
[سيناريو خصم غير مبرر] خصم بدون سبب نظامي → المادة 91
[سيناريو استقالة بدون إشعار] ترك العمل بدون إشعار → المادة 75
[سيناريو مكافأة نهاية خدمة] حساب المستحقات → المادة 84

═══════════════════════════════════════════════════════════════
المرحلة 3: التحليل الذكي (AI Reasoning)
═══════════════════════════════════════════════════════════════

- اربط الحالة بالمادة الأقرب من النص المرفق
- تحقق من الاستثناءات والشروط
- إذا يوجد أكثر من احتمال → اعرضها بوضوح

═══════════════════════════════════════════════════════════════
🤝 المرحلة 4: أولوية الحل الودي (إلزامي)
═══════════════════════════════════════════════════════════════

عند إعطاء الحكم النهائي، يجب أن تتبع هذا الترتيب:

1️⃣ الحل الودي أولاً (amicable_solution):
   - اقترح التفاوض المباشر مع صاحب العمل
   - اقترح التواصل مع إدارة الموارد البشرية
   - اقترح الوساطة الداخلية أو لجان تسوية النزاعات
   - اقترح كتابة خطاب رسمي يوضح المطالب

2️⃣ الإجراءات القانونية (action):
   - الحقوق القانونية في حال فشل الحل الودي
   - تقديم شكوى لمكتب العمل
   - رفع دعوى في المحكمة العمالية
   - التوثيق والإثبات المطلوب

3️⃣ التصعيد (في الملاحظات):
   - متى يجب اللجوء للقضاء مباشرة
   - الحالات التي لا ينفع فيها الحل الودي

═══════════════════════════════════════════════════════════════
🎯 نظام أسئلة المتابعة الذكية
═══════════════════════════════════════════════════════════════

عند إعطاء حكم (type: answer)، ولّد 3 أسئلة متابعة ذكية:
1. سؤال يعمق فهم الحالة
2. سؤال عن إجراءات عملية
3. سؤال عن حقوق مرتبطة

═══════════════════════════════════════════════════════════════
قواعد صارمة:
═══════════════════════════════════════════════════════════════

1. أجب فقط عن أسئلة تتعلق بنظام العمل السعودي ولائحة تنظيم العمل الداخلية - سالمو.
2. إذا كان السؤال خارج نطاق نظام العمل السعودي، اعتذر بلطف ووجه المستخدم.
3. لا تخمن أبداً. إذا كان السؤال ناقصاً → اسأل سؤالاً توضيحياً واحداً.
4. يجب أن ترد دائماً بصيغة JSON صالحة فقط، بدون أي نص إضافي.
5. لا تعطي حكم نهائي (type: "answer") قبل جمع معلومات كافية عبر الأسئلة التوضيحية.
6. أعطِ الأولوية للحل الودي قبل التصعيد القانوني.

═══════════════════════════════════════════════════════════════
صيغة الرد الإلزامية (JSON فقط):
═══════════════════════════════════════════════════════════════

إذا كنت تحتاج معلومات إضافية (سؤال توضيحي — هذا هو الرد الافتراضي للأسئلة القصيرة):
{{
  "type": "clarification",
  "question": "سؤالك التوضيحي هنا — سؤال واحد فقط، واضح ومحدد",
  "source": "internal"
}}

إذا جمعت معلومات كافية وتملك ما يكفي للحكم:
{{
  "type": "answer",
  "case_type": "نوع الحالة باختصار",
  "ruling": "الحكم القانوني — يحق / لا يحق / يعتمد",
  "article": "رقم المادة من نظام العمل السعودي",
  "amicable_solution": "الحل الودي المقترح — خطوات التفاوض والتسوية قبل اللجوء للقانون (التواصل مع الإدارة، كتابة خطاب رسمي، الوساطة)",
  "explanation": "شرح مبسط يربط الحالة بالمادة — مستند على النص المرفق فقط",
  "action": "الإجراءات القانونية في حال فشل الحل الودي: خطوات واضحة (تقديم شكوى لمكتب العمل، رفع دعوى...)",
  "notes": "ملاحظات: شروط واستثناءات ومعلومات ناقصة إن وجدت",
  "follow_up_questions": [
    "سؤال متابعة ذكي 1",
    "سؤال متابعة ذكي 2",
    "سؤال متابعة ذكي 3"
  ],
  "source": "internal / llm / hybrid — مصدر الإجابة (internal = من النظام المرفق، llm = من المعرفة العامة، hybrid = مزيج)",
  "disclaimer": "هذه المعلومات إرشادية وليست بديلاً عن الاستشارة القانونية الرسمية. ننصح بالتواصل مع محامٍ مختص للحالات المعقدة."
}}

إذا كان السؤال خارج نطاق نظام العمل السعودي:
{{
  "type": "out_of_scope",
  "message": "اعتذارك وتوجيهك هنا",
  "source": "none"
}}

إذا لم تجد الإجابة في أي مصدر متاح:
{{
  "type": "not_found",
  "message": "المعلومة غير موجودة في المرجع المتاح حالياً. يُنصح بالرجوع لمكتب العمل أو مستشار قانوني.",
  "source": "none"
}}

تذكر: ارجع JSON فقط، بدون ```json ولا أي تنسيق إضافي.

═══════════════════════════════════════════════════════════════
النص القانوني المرجعي (الدستور):
═══════════════════════════════════════════════════════════════

{kb_content}

═══════════════════════════════════════════════════════════════
نهاية النص القانوني المرجعي
═══════════════════════════════════════════════════════════════"""


@lru_cache(maxsize=1)
def _build_system_prompt_full() -> str:
    """Build the FULL system prompt with the entire labor law KB injected.
    Used as a fallback when smart retrieval finds no relevant articles.
    Cached since the KB is loaded once at module level."""
    return SYSTEM_PROMPT.format(kb_content=_LABOR_LAW_KB[:50000])


def _retrieve_relevant_articles(question: str, max_articles: int = 12, max_chars: int = 10000) -> str:
    """Smart KB retrieval: find the most relevant articles from the structured
    index based on keyword matching against the user's question.
    Returns concatenated article texts (capped at max_chars)."""
    if not _LAW_ARTICLES_INDEX:
        return _LABOR_LAW_KB[:max_chars] if _LABOR_LAW_KB else ""

    q_lower = question.lower()
    q_words = _extract_keywords(question)

    scored: list[tuple[dict, int]] = []
    for art in _LAW_ARTICLES_INDEX:
        if art.get("cancelled", False):
            continue
        score = 0
        topic = art.get("topic", "")
        text = art.get("text", "")
        art_name = art.get("article_name", "")

        # Check topic match (high weight)
        if topic:
            for w in q_words:
                if w in topic:
                    score += 20
            # Also check the _KB_KEYWORD_MAP for category keywords
            for _cat, info in _KB_KEYWORD_MAP.items():
                for kw in info["keywords"]:
                    if kw in q_lower:
                        for art_num in info["articles"]:
                            if str(art.get("article_number", "")) == art_num:
                                score += 30
                        break

        # Check text match (lower weight)
        text_lower = text.lower()
        for w in q_words:
            count = text_lower.count(w)
            if count > 0:
                score += count * 3

        # Check article name match
        if art_name:
            for w in q_words:
                if w in art_name:
                    score += 10

        if score > 0:
            scored.append((art, score))

    if not scored:
        # No keyword matches — return a trimmed version of the full KB
        return _LABOR_LAW_KB[:max_chars] if _LABOR_LAW_KB else ""

    # Sort by score descending, take top articles
    scored.sort(key=lambda x: x[1], reverse=True)
    top_articles = scored[:max_articles]

    # Build concatenated text
    parts: list[str] = []
    total_len = 0
    for art, _score in top_articles:
        art_num = art.get("article_number", "?")
        system_name = art.get("system", "")
        topic = art.get("topic", "")
        text = art.get("text", "")
        header = f"[{system_name} - المادة {art_num}] ({topic})"
        entry = f"{header}\n{text}\n"
        if total_len + len(entry) > max_chars:
            remaining = max_chars - total_len
            if remaining > 100:
                parts.append(entry[:remaining] + "...")
            break
        parts.append(entry)
        total_len += len(entry)

    return "\n".join(parts)


def _build_system_prompt(question: str = "") -> str:
    """Build the system prompt with RELEVANT articles injected based on the question.
    If question is empty or no relevant articles found, falls back to full KB.
    Always appends Arabic language instruction to ensure consistent JSON responses."""
    if not question:
        base_prompt = _build_system_prompt_full()
    else:
        relevant_content = _retrieve_relevant_articles(question)
        if not relevant_content:
            base_prompt = _build_system_prompt_full()
        else:
            base_prompt = SYSTEM_PROMPT.format(kb_content=relevant_content)

    # Always append Arabic language instruction to reinforce proper JSON response format
    lang_instruction = (
        "\n\n═══════════════════════════════════════════════════════════════\n"
        "⚠️ تعليمات اللغة والتنسيق ⚠️\n"
        "═══════════════════════════════════════════════════════════════\n"
        "يجب أن ترد باللغة العربية بالكامل. جميع قيم حقول JSON يجب أن تكون باللغة العربية.\n"
        "يجب أن يكون ردك JSON صالح فقط — بدون أي نص قبله أو بعده.\n"
        "اعتمد على المعلومات من النص القانوني المرفق أعلاه كمصدر أول. يمكنك استخدام معرفتك العامة كمصدر ثانوي للشرح والتوضيح فقط عند عدم توفر المعلومة في النص المرفق.\n"
        "وضّح مصدر إجابتك دائماً في حقل source.\n"
        "اذكر رقم المادة والبند في كل إجابة.\n"
        "═══════════════════════════════════════════════════════════════"
    )

    return base_prompt + lang_instruction


CONTRACT_ANALYSIS_PROMPT = """أنت "Salmo Assist Pro"، محلل عقود عمل بنظام تقييم احترافي متخصص في نظام العمل السعودي.

مهمتك:
تحليل عقد العمل وتقديم تقييم رقمي (Score من 100) بناءً على جودة العقد ومخاطره، مع إنتاج تقرير احترافي جاهز للطباعة.

═══════════════════════════════════════════════════════════════
المرحلة 1: استخراج البيانات
═══════════════════════════════════════════════════════════════

استخرج من العقد:
- نوع العقد (محدد / غير محدد)
- الراتب
- مدة العقد
- فترة التجربة
- الإجازات
- شرط الإنهاء
- الجزاءات
- عدم المنافسة

═══════════════════════════════════════════════════════════════
المرحلة 2: التقييم الرقمي
═══════════════════════════════════════════════════════════════

ابدأ من 100 نقطة، ثم خصم النقاط حسب:

خصم عالي (-10 إلى -25):
- شرط غير نظامي
- بند يضر الموظف بشكل واضح
- غموض كبير في بند مهم

خصم متوسط (-5 إلى -10):
- بند ناقص
- شرط غير واضح
- تفاصيل غير مكتملة

خصم بسيط (-1 إلى -5):
- نقص بسيط في الصياغة
- غياب توضيح جزئي

لكل خصم، اذكر السبب والمبلغ المخصوم في deductions.

═══════════════════════════════════════════════════════════════
المرحلة 3: التحليل القانوني
═══════════════════════════════════════════════════════════════

لكل بند:
- هل يتوافق مع نظام العمل؟
- هل فيه خطر على الموظف؟
- مستوى المخاطر (منخفض/متوسط/مرتفع)

═══════════════════════════════════════════════════════════════
المرحلة 4: كشف المشاكل والتوصيات
═══════════════════════════════════════════════════════════════

حدد:
- بنود غير واضحة
- بنود قد تكون غير نظامية
- شروط قد تضر الموظف
- التوصيات العملية

═══════════════════════════════════════════════════════════════
تفسير التقييم:
═══════════════════════════════════════════════════════════════

90 - 100 → ممتاز
75 - 89 → جيد مع ملاحظات
60 - 74 → متوسط (يحتاج مراجعة)
أقل من 60 → خطر

═══════════════════════════════════════════════════════════════
قواعد صارمة:
═══════════════════════════════════════════════════════════════

- لا تعطي تقييم بدون تحليل
- لا تبالغ في الخصم
- اربط كل خصم بسبب واضح
- إذا العقد ناقص → وضّح ذلك
- لا تفترض معلومات غير موجودة
- اربط التحليل بنظام العمل السعودي
- استخدم لغة بسيطة ومهنية

═══════════════════════════════════════════════════════════════
النص القانوني المرجعي (الدستور):
═══════════════════════════════════════════════════════════════

{kb_content}

═══════════════════════════════════════════════════════════════
نهاية النص القانوني المرجعي
═══════════════════════════════════════════════════════════════

يجب أن ترد دائماً بصيغة JSON صالحة فقط، بدون أي نص إضافي قبل أو بعد.

صيغة الرد الإلزامية (JSON فقط):
{{
  "type": "contract_analysis",
  "score": 0,
  "score_label": "ممتاز / جيد مع ملاحظات / متوسط / خطر",
  "risk_level": "منخفض / متوسط / عالي",
  "deductions": [
    {{
      "reason": "سبب الخصم",
      "points": -10,
      "category": "عالي / متوسط / بسيط"
    }}
  ],
  "summary": {{
    "contract_type": "نوع العقد",
    "salary": "الراتب",
    "duration": "مدة العقد",
    "probation": "فترة التجربة",
    "leave": "الإجازات",
    "termination_clause": "شرط الإنهاء",
    "penalties_clause": "شرط الجزاءات",
    "non_compete": "شرط عدم المنافسة"
  }},
  "legal_analysis": [
    {{
      "clause": "اسم البند",
      "compliant": true,
      "risk_level": "منخفض/متوسط/مرتفع",
      "explanation": "شرح التوافق أو المخالفة مع نظام العمل"
    }}
  ],
  "issues": [
    {{
      "issue": "وصف المشكلة",
      "severity": "منخفض/متوسط/مرتفع",
      "article": "المادة ذات الصلة",
      "recommendation": "التوصية"
    }}
  ],
  "assessment": {{
    "overall_rating": "سليم / فيه ملاحظات / يحتاج مراجعة",
    "risk_points": ["نقطة المخاطر 1", "نقطة المخاطر 2"],
    "recommendations": ["التوصية 1", "التوصية 2"],
    "should_sign": true,
    "should_sign_note": "ملاحظة حول التوقيع"
  }},
  "report": {{
    "report_id": "SAL-2026-XXXX",
    "date": "تاريخ اليوم",
    "title": "Contract Analysis Report",
    "legal_notice": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية"
  }},
  "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية"
}}

تذكر: ارجع JSON فقط، بدون ```json ولا أي تنسيق إضافي."""


class AskRequest(BaseModel):
    question: str
    session_id: str = "default"


class AnalyzeContractRequest(BaseModel):
    contract_text: str


class ResumeAnalysisRequest(BaseModel):
    resumes: list[dict]  # [{"name": "filename", "text": "cv text"}]
    job_description: str = ""

class SearchKBRequest(BaseModel):
    query: str
    max_results: int = 20

class EosbRequest(BaseModel):
    # Legacy fields (backward compatible)
    monthly_salary: float = 0
    service_years: float = 0
    service_months: float = 0
    reason: str = "انتهاء مدة العقد"
    unused_vacation_days: float = 0

    # New enhanced fields
    contract_type: str = ""  # "محدد المدة" | "غير محدد المدة"
    start_date: str = ""  # ISO date string (YYYY-MM-DD)
    end_date: str = ""  # ISO date string (YYYY-MM-DD)
    basic_salary: float = 0  # الراتب الأساسي
    actual_salary: float = 0  # الأجر الفعلي (used for EOSB per law)
    remaining_contract_months: float = 0  # for fixed-term early termination
    notice_served: bool = True  # whether proper notice was given


# All 9 official HRSD termination reasons with their adjustment factors
_HRSD_REASONS: dict[str, dict] = {
    "انتهاء مدة العقد": {
        "factor": 1.0,
        "label": "انتهاء مدة العقد",
        "legal_ref": "المادة 74 - انتهاء العقد بانتهاء مدته",
        "category": "full",
    },
    "اتفاق الطرفين على إنهاء العقد": {
        "factor": 1.0,
        "label": "اتفاق الطرفين",
        "legal_ref": "المادة 74 - إنهاء العقد باتفاق الطرفين",
        "category": "full",
    },
    "فسخ العقد من قبل صاحب العمل": {
        "factor": 1.0,
        "label": "فسخ من صاحب العمل",
        "legal_ref": "المادة 77 - إنهاء العقد لسبب غير مشروع، المادة 83 - مكافأة نهاية الخدمة كاملة",
        "category": "full",
    },
    "فسخ العقد من قبل صاحب العمل لأحد الحالات الواردة في المادة 80": {
        "factor": 0.0,
        "label": "فسخ بموجب المادة 80",
        "legal_ref": "المادة 80 - حالات فسخ العقد دون مكافأة أو إشعار أو تعويض",
        "category": "no_reward",
    },
    "ترك الموظف العمل نتيجة لقوة قاهرة": {
        "factor": 1.0,
        "label": "قوة قاهرة",
        "legal_ref": "المادة 74 - انتهاء العقد بسبب قوة قاهرة",
        "category": "full",
    },
    "إنهاء الموظفة لعقد العمل خلال 6 أشهر من الزواج أو 3 أشهر من الوضع": {
        "factor": 1.0,
        "label": "إنهاء بسبب الزواج أو الوضع",
        "legal_ref": "المادة 87 - استحقاق المكافأة كاملة للعاملة عند إنهاء العقد بسبب الزواج أو الوضع",
        "category": "full",
    },
    "ترك الموظف العمل لأحد الحالات الواردة في المادة 81": {
        "factor": 1.0,
        "label": "ترك العمل بموجب المادة 81",
        "legal_ref": "المادة 81 - حالات ترك العمل المشروعة مع استحقاق كامل الحقوق",
        "category": "full",
    },
    "فسخ العقد من قبل الموظف أو ترك العمل لغير الحالات الواردة في المادة 81": {
        "factor": -1,  # Special: uses resignation rules
        "label": "ترك العمل بدون سبب مشروع",
        "legal_ref": "المادة 85 - مكافأة نهاية الخدمة في حالة الاستقالة (ثلث/ثلثين/كامل)",
        "category": "resignation",
    },
    "استقالة الموظف": {
        "factor": -1,  # Special: uses resignation rules
        "label": "استقالة",
        "legal_ref": "المادة 85 - مكافأة نهاية الخدمة في حالة الاستقالة (ثلث/ثلثين/كامل حسب مدة الخدمة)",
        "category": "resignation",
    },
    # Legacy reasons mapping (backward compatibility)
    "استقالة": {
        "factor": -1,
        "label": "استقالة",
        "legal_ref": "المادة 85 - مكافأة نهاية الخدمة في حالة الاستقالة",
        "category": "resignation",
    },
    "فصل": {
        "factor": 1.0,
        "label": "فصل من العمل",
        "legal_ref": "المادة 77 - إنهاء العقد من صاحب العمل، المادة 83 - مكافأة نهاية الخدمة",
        "category": "full",
    },
    "انتهاء عقد": {
        "factor": 1.0,
        "label": "انتهاء مدة العقد",
        "legal_ref": "المادة 74 - انتهاء العقد بانتهاء مدته",
        "category": "full",
    },
}


def _calculate_resignation_factor(total_service: float) -> tuple[float, str]:
    """Calculate the adjustment factor for resignation based on service duration."""
    if total_service < 2:
        return 0.0, "أقل من سنتين — لا يستحق مكافأة نهاية الخدمة"
    elif total_service < 5:
        return 1 / 3, "من 2 إلى 5 سنوات — يستحق ثلث المكافأة"
    elif total_service < 10:
        return 2 / 3, "من 5 إلى 10 سنوات — يستحق ثلثي المكافأة"
    else:
        return 1.0, "أكثر من 10 سنوات — يستحق كامل المكافأة"


def _parse_date_safe(date_str: str):
    """Parse an ISO date string safely. Returns date object or None."""
    if not date_str or not date_str.strip():
        return None
    try:
        from datetime import datetime
        return datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


class AskResponse(BaseModel):
    reply: dict
    questions_used: int
    questions_limit: int
    plan: str


class ContractAnalysisResponse(BaseModel):
    analysis: dict


class ResumeAnalysisResponse(BaseModel):
    result: dict


class EosbResponse(BaseModel):
    result: dict


# ── Robust Error Detection ────────────────────────────────────────────────
# The OpenAI SDK may wrap AI Hub errors in ways that hide the detail from str(e).
# These helpers check multiple sources (str, message, body, response) for keywords.


def _extract_error_detail(err: Exception) -> str:
    """Extract error detail from an AI service exception, checking multiple sources."""
    parts: list[str] = []

    # Check str(e)
    parts.append(str(err))

    # Check message attribute (common in Python exceptions)
    msg = getattr(err, "message", None)
    if msg and str(msg) != str(err):
        parts.append(str(msg))

    # Check body attribute (OpenAI SDK APIStatusError stores parsed JSON here)
    body = getattr(err, "body", None)
    if body:
        if isinstance(body, dict):
            # Atoms Cloud format: {"data": {"detail": "..."}}
            nested = body.get("data", {})
            if isinstance(nested, dict):
                detail = nested.get("detail", "")
                if detail:
                    parts.append(str(detail))
            # Direct detail key
            if "detail" in body:
                parts.append(str(body["detail"]))
            # Stringify the whole body as last resort
            parts.append(json.dumps(body, ensure_ascii=False))
        elif isinstance(body, str):
            parts.append(body)

    # Check response.text (raw httpx response)
    resp = getattr(err, "response", None)
    if resp is not None:
        try:
            resp_text = getattr(resp, "text", None)
            if resp_text:
                parts.append(resp_text)
        except Exception:
            pass

    return " ".join(parts).lower()


def _is_balance_error(err: Exception) -> bool:
    """Check if an error is related to insufficient AI balance."""
    detail = _extract_error_detail(err)
    return (
        "insufficient" in detail
        or "balance" in detail
        or "top up" in detail
        or "رصيد" in detail
        or "شحن الرصيد" in detail
    )


# ── Local KB Fallback ──────────────────────────────────────────────────────
# When AI credits are depleted, we search the labor law KB locally using
# keyword matching to provide at least a basic reference answer.

_KB_KEYWORD_MAP = {
    "فصل": {"case_type": "فصل من العمل", "articles": ["77", "80", "81", "82", "83", "85"], "keywords": ["فصل", "طرد", "إنهاء عقد", "فسخ العقد"]},
    "تعسفي": {"case_type": "فصل تعسفي", "articles": ["77", "82", "83"], "keywords": ["فصل تعسفي", "طرد بدون سبب", "إنهاء بدون سبب"]},
    "راتب": {"case_type": "الراتب والأجور", "articles": ["58", "59", "60", "90", "91"], "keywords": ["راتب", "أجر", "تأخير راتب", "خصم راتب"]},
    "تأخير": {"case_type": "تأخير الراتب", "articles": ["90"], "keywords": ["تأخير راتب", "تأخر دفع"]},
    "خصم": {"case_type": "خصم من الراتب", "articles": ["91"], "keywords": ["خصم راتب", "حسم"]},
    "عقد": {"case_type": "عقد العمل", "articles": ["52", "53", "54", "55", "56", "57", "37"], "keywords": ["عقد", "عقد عمل", "محدد", "غير محدد"]},
    "استقالة": {"case_type": "الاستقالة", "articles": ["75", "85"], "keywords": ["استقالة", "استقال", "ترك العمل"]},
    "إجازة": {"case_type": "الإجازات", "articles": ["65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "76", "77"], "keywords": ["إجازة", "إجازات", "عطلة", "راحة"]},
    "مكافأة": {"case_type": "مكافأة نهاية الخدمة", "articles": ["84", "85", "86", "87"], "keywords": ["مكافأة", "نهاية خدمة", "مستحقات"]},
    "ساعات": {"case_type": "ساعات العمل", "articles": ["58", "59", "60", "61", "62"], "keywords": ["ساعات عمل", "ساعات", "عمل إضافي", "إضافي"]},
    "تجربة": {"case_type": "فترة التجربة", "articles": ["53", "54"], "keywords": ["تجربة", "فترة تجربة"]},
    "مرضية": {"case_type": "الإجازة المرضية", "articles": ["68"], "keywords": ["مرضية", "مرض", "إجازة مرض"]},
    "وضع": {"case_type": "إجازة الوضع", "articles": ["69", "70"], "keywords": ["وضع", "إجازة وضع", "حمل", "ولادة"]},
    "سلامة": {"case_type": "السلامة والصحة المهنية", "articles": ["78", "79", "80", "94", "95", "96", "97", "98"], "keywords": ["سلامة", "صحة مهنية", "إصابة عمل"]},
    "إصابة": {"case_type": "إصابات العمل", "articles": ["92", "93"], "keywords": ["إصابة عمل", "إصابة", "حادث عمل"]},
    "تدريب": {"case_type": "التدريب", "articles": ["55"], "keywords": ["تدريب", "تأهيل"]},
    "توظيف": {"case_type": "التوظيف", "articles": ["22", "23", "24", "25", "26", "27", "28"], "keywords": ["توظيف", "عمل", "تشغيل"]},
    "امتحان": {"case_type": "الإجازة للامتحانات", "articles": ["73"], "keywords": ["امتحان", "اختبار", "دراسة", "جامعة"]},
    "دراسة": {"case_type": "الإجازة للدراسة", "articles": ["73"], "keywords": ["دراسة", "جامعة", "تعليم"]},
    "سياسات": {"case_type": "السياسات الداخلية", "articles": [], "keywords": ["سياسة", "سياسات", "لائحة داخلية", "لائحة تنظيم"]},
    "بدلات": {"case_type": "المزايا والبدلات", "articles": [], "keywords": ["بدل", "بدلات", "مزايا", "علاوة", "علاوات"]},
    "ترقية": {"case_type": "الترقيات", "articles": [], "keywords": ["ترقية", "ترقيات"]},
    "جزاءات": {"case_type": "المخالفات والجزاءات", "articles": [], "keywords": ["جزاء", "جزاءات", "مخالفة", "مخالفات", "عقوبة"]},
    "انتداب": {"case_type": "الانتداب", "articles": [], "keywords": ["انتداب", "مهمة عمل", "سفر عمل"]},
    "نقل": {"case_type": "النقل", "articles": [], "keywords": ["نقل", "نقل عامل", "تحويل"]},
}


def _extract_article_text(article_num: str) -> str:
    """Extract the full text of a specific article from the KB."""
    if not _LABOR_LAW_KB:
        return ""
    patterns = [
        rf"المادة\s*(?:\([^)]*\)\s*)?{article_num}\s*[:\.\-]",
        rf"المادة\s+{article_num}\s*[:\.\-]",
    ]
    arabic_nums = {
        "1": "الأولى", "2": "الثانية", "3": "الثالثة", "4": "الرابعة", "5": "الخامسة",
        "6": "السادسة", "7": "السابعة", "8": "الثامنة", "9": "التاسعة", "10": "العاشرة",
        "11": "الحادية عشرة", "12": "الثانية عشرة", "13": "الثالثة عشرة", "14": "الرابعة عشرة",
        "15": "الخامسة عشرة", "16": "السادسة عشرة", "17": "السابعة عشرة", "18": "الثامنة عشرة",
        "19": "التاسعة عشرة", "20": "العشرون",
        "21": "الحادية والعشرون", "22": "الثانية والعشرون", "23": "الثالثة والعشرون",
        "24": "الرابعة والعشرون", "25": "الخامسة والعشرون", "26": "السادسة والعشرون",
        "27": "السابعة والعشرون", "28": "الثامنة والعشرون", "29": "التاسعة والعشرون",
        "30": "الثلاثون", "31": "الحادية والثلاثون", "32": "الثانية والثلاثون",
        "33": "الثالثة والثلاثون", "34": "الرابعة والثلاثون", "35": "الخامسة والثلاثون",
        "36": "السادسة والثلاثون", "37": "السابعة والثلاثون", "38": "الثامنة والثلاثون",
        "39": "التاسعة والثلاثون", "40": "الأربعون",
        "41": "الحادية والأربعون", "42": "الثانية والأربعون", "43": "الثالثة والأربعون",
        "44": "الرابعة والأربعون", "45": "الخامسة والأربعون", "46": "السادسة والأربعون",
        "47": "السابعة والأربعون", "48": "الثامنة والأربعون", "49": "التاسعة والأربعون",
        "50": "الخمسون", "51": "الحادية والخمسون", "52": "الثانية والخمسون",
        "53": "الثالثة والخمسون", "54": "الرابعة والخمسون", "55": "الخامسة والخمسون",
        "56": "السادسة والخمسون", "57": "السابعة والخمسون", "58": "الثامنة والخمسون",
        "59": "التاسعة والخمسون", "60": "الستون",
        "61": "الحادية والستون", "62": "الثانية والستون", "63": "الثالثة والستون",
        "64": "الرابعة والستون", "65": "الخامسة والستون", "66": "السادسة والستون",
        "67": "السابعة والستون", "68": "الثامنة والستون", "69": "التاسعة والستون",
        "70": "السبعون", "71": "الحادية والسبعون", "72": "الثانية والسبعون",
        "73": "الثالثة والسبعون", "74": "الرابعة والسبعون", "75": "الخامسة والسبعون",
        "76": "السادسة والسبعون", "77": "السابعة والسبعون", "78": "الثامنة والسبعون",
        "79": "التاسعة والسبعون", "80": "الثمانون",
        "81": "الحادية والثمانون", "82": "الثانية والثمانون", "83": "الثالثة والثمانون",
        "84": "الرابعة والثمانون", "85": "الخامسة والثمانون", "86": "السادسة والثمانون",
        "87": "السابعة والثمانون", "88": "الثامنة والثمانون", "89": "التاسعة والثمانون",
        "90": "التسعون", "91": "الحادية والتسعون", "92": "الثانية والتسعون",
        "93": "الثالثة والتسعون", "94": "الرابعة والتسعون", "95": "الخامسة والتسعون",
        "96": "السادسة والتسعون", "97": "السابعة والتسعون", "98": "الثامنة والتسعون",
        "99": "التاسعة والتسعون", "100": "المائة",
    }
    arabic_word = arabic_nums.get(article_num, "")
    if arabic_word:
        patterns.append(rf"المادة\s+{arabic_word}\s*[:\.\-]")

    for pattern in patterns:
        match = re.search(pattern, _LABOR_LAW_KB)
        if match:
            start = match.start()
            next_article = re.search(r"المادة\s+", _LABOR_LAW_KB[start + 10:])
            if next_article:
                end = start + 10 + next_article.start()
            else:
                end = start + 800
            text = _LABOR_LAW_KB[start:end].strip()
            if len(text) > 600:
                text = text[:600] + "..."
            return text
    return ""


def _local_kb_fallback(question: str) -> dict | None:
    """
    When AI credits are depleted, search the local KB for relevant articles.
    Returns a structured reply dict or None if no match found.
    """
    if not _LABOR_LAW_KB:
        return None

    q_lower = question.lower()

    # Find the best matching category
    best_match = None
    best_score = 0

    for category, info in _KB_KEYWORD_MAP.items():
        score = 0
        for kw in info["keywords"]:
            if kw in q_lower:
                score += len(kw)
        if score > best_score:
            best_score = score
            best_match = info

    if not best_match:
        # Try a broader search — look for any article number mentioned in the question
        article_match = re.search(r"المادة\s+(\d+)", question)
        if article_match:
            article_num = article_match.group(1)
            article_text = _extract_article_text(article_num)
            if article_text:
                return {
                    "type": "answer",
                    "case_type": "استفسار عن مادة قانونية",
                    "ruling": "تم العثور على المادة المطلوبة",
                    "article": f"المادة {article_num}",
                    "explanation": article_text,
                    "action": "راجع النص القانوني أعلاه واستشر محامياً إذا لزم الأمر",
                    "notes": "⚠️ هذا الرد من البحث المحلي في قاعدة المعرفة بسبب نفاد رصيد الذكاء الاصطناعي. قد لا يكون التحليل شاملاً.",
                    "follow_up_questions": [
                        "ما حقوقي عند الفصل من العمل؟",
                        "كم مكافأة نهاية الخدمة المستحقة؟",
                        "ما الإجازات التي يضمنها نظام العمل؟",
                    ],
                    "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
                }
        return None

    # Extract text for the top relevant articles
    article_texts = []
    for art_num in best_match["articles"][:3]:
        text = _extract_article_text(art_num)
        if text:
            article_texts.append(f"المادة {art_num}:\n{text}")

    if not article_texts:
        return None

    explanation = "\n\n".join(article_texts)
    articles_str = "، ".join([f"المادة {a}" for a in best_match["articles"][:3]])

    return {
        "type": "answer",
        "case_type": best_match["case_type"],
        "ruling": "تم العثور على مواد قانونية ذات صلة",
        "article": articles_str,
        "explanation": explanation,
        "action": "راجع المواد القانونية أعلاه واستشر محامياً أو توجه لمكتب العمل إذا لزم الأمر",
        "notes": "⚠️ هذا الرد من البحث المحلي في قاعدة المعرفة بسبب نفاد رصيد الذكاء الاصطناعي. التحليل قد لا يكون شاملاً — يُنصح بشحن الرصيد للحصول على إجابات أدق.",
        "follow_up_questions": [
            "ما حقوقي عند الفصل من العمل؟",
            "كم مكافأة نهاية الخدمة المستحقة؟",
            "ما الإجازات التي يضمنها نظام العمل؟",
        ],
        "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
    }


def _generic_fallback(question: str) -> dict:
    """Always return a valid answer — even when local KB has no keyword match."""
    return {
        "type": "answer",
        "case_type": "استفسار عام",
        "ruling": "يرجى إعادة صياغة السؤال",
        "article": "-",
        "explanation": "عذراً، خدمة الذكاء الاصطناعي غير متاحة حالياً ولم يتم العثور على نتيجة مطابقة في قاعدة المعرفة المحلية. يرجى المحاولة لاحقاً أو التواصل مع مكتب العمل.",
        "action": "يمكنك المحاولة مرة أخرى لاحقاً أو التواصل مع مكتب العمل مباشرة",
        "notes": "⚠️ هذا الرد من البحث المحلي بسبب نفاد رصيد الذكاء الاصطناعي. يُنصح بشحن الرصيد للحصول على إجابات أدق.",
        "follow_up_questions": [
            "ما حقوقي عند الفصل من العمل؟",
            "كم مكافأة نهاية الخدمة المستحقة؟",
            "ما الإجازات التي يضمنها نظام العمل؟",
        ],
        "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
    }


@router.get("/quota")
async def get_quota(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's daily quota status — always unlimited"""
    try:
        today_str = date.today().isoformat()
        result = await db.execute(
            select(User_daily_quota).where(
                User_daily_quota.user_id == current_user.id,
                User_daily_quota.quota_date == today_str,
            )
        )
        quota = result.scalar_one_or_none()
        used = quota.question_count if quota else 0
        return {"questions_used": used, "questions_limit": 999999, "plan": "unlimited"}
    except Exception as e:
        logger.error(f"get_quota error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask", response_model=AskResponse)
async def ask(
    data: AskRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a Saudi Labor Law question — unlimited access for all users"""
    try:
        if not data.question or not data.question.strip():
            raise HTTPException(status_code=400, detail="السؤال فارغ")

        # Check chat cache for repeated questions (instant response)
        # Only use cache for standalone questions with no prior conversation context
        _chat_key = data.question.strip().lower()[:200]
        _has_session_history = data.session_id != "default"
        _cached_reply = None if _has_session_history else _get_cached_chat(_chat_key)
        if _cached_reply:
            return AskResponse(
                reply=_cached_reply,
                questions_used=0,
                questions_limit=999999,
                plan="unlimited",
            )

        today_str = date.today().isoformat()

        # Check / create quota for today
        result = await db.execute(
            select(User_daily_quota).where(
                User_daily_quota.user_id == current_user.id,
                User_daily_quota.quota_date == today_str,
            )
        )
        quota = result.scalar_one_or_none()

        if quota is None:
            quota = User_daily_quota(
                user_id=current_user.id,
                quota_date=today_str,
                question_count=0,
                plan="unlimited",
            )
            db.add(quota)
            await db.flush()

        # All users have unlimited access — upgrade any legacy plans
        if quota.plan != "unlimited":
            quota.plan = "unlimited"
            await db.flush()
        plan = "unlimited"
        limit = 999999

        # Load recent conversation history for this session (last 5 messages)
        # Reduced from 10 to 5 to cut token count and speed up responses
        history_msgs: list[ChatMessage] = []
        try:
            hist_result = await db.execute(
                select(Chat_messages)
                .where(
                    Chat_messages.user_id == current_user.id,
                    Chat_messages.session_id == data.session_id,
                )
                .order_by(Chat_messages.id.desc())
                .limit(5)
            )
            history_rows = list(reversed(hist_result.scalars().all()))
            for hm in history_rows:
                history_msgs.append(ChatMessage(role=hm.role, content=hm.content))
        except Exception as hist_err:
            logger.warning(f"Failed to load history: {hist_err}")

        # ── Try AI with smart KB retrieval ─────────────────────────────────
        # Uses a single model (deepseek-v3.2) with question-specific KB content
        # instead of sending 50K chars every time. Falls back to local KB on failure.
        raw_content = ""
        last_ai_err: Exception | None = None

        try:
            service = _get_ai_service()
            # Smart retrieval: inject only relevant articles based on the question
            system_prompt = _build_system_prompt(question=data.question)
            ai_messages = [ChatMessage(role="system", content=system_prompt)]
            ai_messages.extend(history_msgs)
            ai_messages.append(ChatMessage(role="user", content=data.question))
            request = GenTxtRequest(
                messages=ai_messages,
                model="deepseek-v3.2",
                temperature=0.7,
                max_tokens=1024,
            )
            response = await service.gentxt(request)
            raw_content = response.content or ""
            if raw_content:
                logger.info("AI call succeeded with model: deepseek-v3.2")
        except Exception as ai_err:
            last_ai_err = ai_err
            logger.warning(
                f"AI model deepseek-v3.2 failed: {type(ai_err).__name__}: {ai_err}"
            )

        # ── If all AI models failed — ALWAYS fall back to local KB ─────────
        # This is the key fix: we never raise a 402/502 to the user.
        # Instead, we always provide an answer from the local knowledge base.
        if not raw_content:
            if last_ai_err is not None:
                logger.info(
                    f"All AI models failed — using local KB fallback. Last error: {last_ai_err}"
                )
            fallback = _local_kb_fallback(data.question) or _generic_fallback(data.question)

            # Increment quota count
            quota.question_count = (quota.question_count or 0) + 1
            await db.flush()

            # Store messages
            db.add(
                Chat_messages(
                    user_id=current_user.id,
                    role="user",
                    content=data.question,
                    session_id=data.session_id,
                )
            )
            db.add(
                Chat_messages(
                    user_id=current_user.id,
                    role="assistant",
                    content=json.dumps(fallback, ensure_ascii=False),
                    session_id=data.session_id,
                )
            )
            await db.commit()

            return AskResponse(
                reply=fallback,
                questions_used=quota.question_count,
                questions_limit=limit,
                plan=plan,
            )

        raw_content = raw_content.strip()

        if not raw_content:
            raise HTTPException(
                status_code=502,
                detail="لم يتم الحصول على رد من الذكاء الاصطناعي، يرجى المحاولة مرة أخرى",
            )

        # Strip possible markdown fences
        if raw_content.startswith("```"):
            raw_content = raw_content.strip("`")
            if raw_content.lower().startswith("json"):
                raw_content = raw_content[4:].strip()

        # Try to parse JSON from the response
        parsed = None
        try:
            parsed = json.loads(raw_content)
        except Exception:
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                except Exception:
                    parsed = None

        # Ensure parsed is always a dict with required fields
        if not isinstance(parsed, dict):
            parsed = {
                "type": "answer",
                "case_type": "استفسار عام",
                "ruling": "يرجى إعادة صياغة السؤال",
                "article": "-",
                "explanation": raw_content[:500],
                "action": "حاول صياغة سؤالك بشكل أوضح حول نظام العمل السعودي",
                "notes": "",
                "follow_up_questions": [
                    "ما حقوقي عند الفصل من العمل؟",
                    "كم مكافأة نهاية الخدمة المستحقة؟",
                    "ما الإجازات التي يضمنها نظام العمل؟",
                ],
                "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
            }

        if "type" not in parsed:
            parsed["type"] = "answer"

        # Ensure follow_up_questions exists for answer type
        if parsed.get("type") == "answer" and "follow_up_questions" not in parsed:
            parsed["follow_up_questions"] = [
                "ما حقوقي عند الفصل من العمل؟",
                "كم مكافأة نهاية الخدمة المستحقة؟",
                "ما الإجازات التي يضمنها نظام العمل؟",
            ]

        # Increment quota count
        quota.question_count = (quota.question_count or 0) + 1
        await db.flush()

        # Store messages
        db.add(
            Chat_messages(
                user_id=current_user.id,
                role="user",
                content=data.question,
                session_id=data.session_id,
            )
        )
        db.add(
            Chat_messages(
                user_id=current_user.id,
                role="assistant",
                content=json.dumps(parsed, ensure_ascii=False),
                session_id=data.session_id,
            )
        )
        await db.commit()

        # Cache the successful response — only cache final answers, not clarifications
        if parsed.get("type") == "answer" and not _has_session_history:
            _set_cached_chat(_chat_key, parsed)

        return AskResponse(
            reply=parsed,
            questions_used=quota.question_count,
            questions_limit=limit,
            plan=plan,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ask error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل الطلب: {str(e)}")


@lru_cache(maxsize=1)
def _build_contract_prompt() -> str:
    """Build the contract analysis system prompt with the labor law KB injected.
    Using 50000 chars to cover the full work system law + executive regulations.
    Cached since the KB is loaded once at module level."""
    return CONTRACT_ANALYSIS_PROMPT.format(kb_content=_LABOR_LAW_KB[:50000])


@router.post("/analyze-contract", response_model=ContractAnalysisResponse)
async def analyze_contract(
    data: AnalyzeContractRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Analyze an employment contract against Saudi Labor Law — 4-stage analysis"""
    try:
        if not data.contract_text or not data.contract_text.strip():
            raise HTTPException(status_code=400, detail="نص العقد فارغ")

        contract_text = data.contract_text.strip()

        # Validate minimum contract text length
        if len(contract_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="نص العقد قصير جداً. يرجى التأكد من رفع العقد كاملاً أو لصق النص بالكامل (50 حرف على الأقل).",
            )

        # Truncate very long contracts to avoid token limits (keep first 15000 chars)
        if len(contract_text) > 15000:
            contract_text = contract_text[:15000] + "\n\n[... تم اقتطاع النص لطوله — يتم تحليل أول 15000 حرف]"
            logger.info(f"Contract text truncated from {len(data.contract_text)} to 15000 chars")

        logger.info(f"Starting contract analysis for user {current_user.id}, text length: {len(contract_text)}")

        # Call AI with contract analysis prompt — single model, singleton service
        raw_content = ""
        last_ai_err: Exception | None = None

        try:
            service = _get_ai_service()
            ai_messages = [
                ChatMessage(role="system", content=_build_contract_prompt()),
                ChatMessage(role="user", content=f"قم بتحليل عقد العمل التالي:\n\n{contract_text}"),
            ]
            request = GenTxtRequest(
                messages=ai_messages,
                model="deepseek-v3.2",
                temperature=0.5,
                max_tokens=4096,
            )
            response = await service.gentxt(request)
            raw_content = response.content or ""
            if raw_content:
                logger.info(f"Contract analysis succeeded with model: deepseek-v3.2, response length: {len(raw_content)}")
            else:
                logger.warning("Contract analysis returned empty content from AI model")
        except Exception as ai_err:
            last_ai_err = ai_err
            error_detail = _extract_error_detail(ai_err)
            logger.warning(
                f"Contract analysis model deepseek-v3.2 failed: {type(ai_err).__name__}: {error_detail[:500]}"
            )

        # If AI model failed — return a descriptive fallback analysis
        if not raw_content and last_ai_err is not None:
            is_balance = _is_balance_error(last_ai_err)
            error_reason = "نفاد رصيد الذكاء الاصطناعي" if is_balance else "خطأ في خدمة الذكاء الاصطناعي"
            logger.info(f"AI failed for contract analysis — returning fallback. Balance error: {is_balance}")
            return ContractAnalysisResponse(
                analysis={
                    "type": "contract_analysis",
                    "score": 0,
                    "score_label": "غير متاح",
                    "risk_level": "غير محدد",
                    "deductions": [],
                    "summary": {
                        "contract_type": f"غير محدد — {error_reason}",
                        "salary": "-",
                        "duration": "-",
                        "probation": "-",
                        "leave": "-",
                        "termination_clause": "-",
                        "penalties_clause": "-",
                        "non_compete": "-",
                    },
                    "legal_analysis": [],
                    "issues": [
                        {
                            "issue": f"تعذر تحليل العقد بسبب {error_reason}",
                            "severity": "مرتفع",
                            "article": "-",
                            "recommendation": "يرجى المحاولة مرة أخرى لاحقاً أو شحن الرصيد" if is_balance else "يرجى المحاولة مرة أخرى بعد قليل",
                        }
                    ],
                    "assessment": {
                        "overall_rating": "غير متاح",
                        "risk_points": [f"تعذر التحليل — {error_reason}"],
                        "recommendations": [
                            "شحن الرصيد وإعادة المحاولة" if is_balance else "إعادة المحاولة بعد دقيقة",
                            "مراجعة العقد يدوياً أو استشارة محامٍ",
                        ],
                        "should_sign": False,
                        "should_sign_note": "لم يتم إكمال التحليل — يرجى عدم التوقيع حتى مراجعة العقد",
                    },
                    "report": {
                        "report_id": "SAL-2026-UNAVAIL",
                        "date": date.today().isoformat(),
                        "title": "Contract Analysis Report (Unavailable)",
                        "legal_notice": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
                    },
                    "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
                    "error_type": "balance" if is_balance else "service",
                }
            )

        # If raw_content is empty without an error (edge case)
        if not raw_content:
            logger.error("Contract analysis: AI returned empty content without raising an error")
            raise HTTPException(
                status_code=502,
                detail="لم يتم الحصول على رد من الذكاء الاصطناعي، يرجى المحاولة مرة أخرى",
            )

        raw_content = raw_content.strip()

        # Robust markdown fence stripping
        # Handle ```json ... ``` or ``` ... ``` wrapping
        fence_match = re.match(r'^```(?:json)?\s*\n?(.*?)\n?```\s*$', raw_content, re.DOTALL | re.IGNORECASE)
        if fence_match:
            raw_content = fence_match.group(1).strip()
        elif raw_content.startswith("```"):
            # Fallback: strip leading/trailing backticks
            raw_content = raw_content.strip("`")
            if raw_content.lower().startswith("json"):
                raw_content = raw_content[4:].strip()

        # Try to parse JSON from the response — multiple strategies
        parsed = None

        # Strategy 1: Direct JSON parse
        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Find the outermost JSON object using brace matching
        if parsed is None:
            try:
                # Find the first '{' and match braces to find the complete JSON object
                start_idx = raw_content.find('{')
                if start_idx != -1:
                    depth = 0
                    end_idx = start_idx
                    in_string = False
                    escape_next = False
                    for i in range(start_idx, len(raw_content)):
                        ch = raw_content[i]
                        if escape_next:
                            escape_next = False
                            continue
                        if ch == '\\' and in_string:
                            escape_next = True
                            continue
                        if ch == '"' and not escape_next:
                            in_string = not in_string
                            continue
                        if in_string:
                            continue
                        if ch == '{':
                            depth += 1
                        elif ch == '}':
                            depth -= 1
                            if depth == 0:
                                end_idx = i
                                break
                    if depth == 0 and end_idx > start_idx:
                        json_str = raw_content[start_idx:end_idx + 1]
                        parsed = json.loads(json_str)
            except (json.JSONDecodeError, ValueError):
                pass

        # Strategy 3: Greedy regex (last resort)
        if parsed is None:
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

        # If all parsing failed, log the raw content for debugging and return a structured fallback
        if not isinstance(parsed, dict):
            logger.error(f"Contract analysis: Failed to parse AI response as JSON. Raw content (first 500 chars): {raw_content[:500]}")
            parsed = {
                "type": "contract_analysis",
                "score": 50,
                "score_label": "متوسط (تحليل جزئي)",
                "risk_level": "متوسط",
                "deductions": [
                    {
                        "reason": "لم يتم إكمال التحليل الكامل — تم الحصول على رد غير منظم من الذكاء الاصطناعي",
                        "points": -50,
                        "category": "عالي",
                    }
                ],
                "summary": {
                    "contract_type": "غير محدد",
                    "salary": "-",
                    "duration": "-",
                    "probation": "-",
                    "leave": "-",
                    "termination_clause": "-",
                    "penalties_clause": "-",
                    "non_compete": "-",
                },
                "legal_analysis": [],
                "issues": [
                    {
                        "issue": "تعذر تحليل العقد بشكل كامل",
                        "severity": "متوسط",
                        "article": "-",
                        "recommendation": "يرجى إعادة المحاولة — قد يكون النص غير واضح أو يحتاج إعادة صياغة",
                    }
                ],
                "assessment": {
                    "overall_rating": "يحتاج مراجعة",
                    "risk_points": ["لم يتم إكمال التحليل بشكل صحيح"],
                    "recommendations": ["إعادة المحاولة", "التأكد من وضوح نص العقد", "استشارة محامٍ"],
                    "should_sign": False,
                    "should_sign_note": "لم يتم إكمال التحليل — يرجى إعادة المحاولة",
                },
                "report": {
                    "report_id": f"SAL-{date.today().strftime('%Y')}-PARTIAL",
                    "date": date.today().isoformat(),
                    "title": "Contract Analysis Report (Partial)",
                    "legal_notice": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
                },
                "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
                "raw_ai_response": raw_content[:300] if raw_content else "",
            }

        if "type" not in parsed:
            parsed["type"] = "contract_analysis"

        # Ensure all expected top-level keys exist with defaults
        if "score" not in parsed:
            parsed["score"] = 0
        if "score_label" not in parsed:
            parsed["score_label"] = getScoreLabel(parsed.get("score", 0)) if callable(globals().get("getScoreLabel", None)) else "غير محدد"
        if "risk_level" not in parsed:
            parsed["risk_level"] = "غير محدد"
        if "deductions" not in parsed:
            parsed["deductions"] = []
        if "summary" not in parsed:
            parsed["summary"] = {}
        if "legal_analysis" not in parsed:
            parsed["legal_analysis"] = []
        if "issues" not in parsed:
            parsed["issues"] = []
        if "assessment" not in parsed:
            parsed["assessment"] = {
                "overall_rating": "غير محدد",
                "risk_points": [],
                "recommendations": [],
                "should_sign": False,
                "should_sign_note": "",
            }
        if "report" not in parsed:
            parsed["report"] = {
                "report_id": f"SAL-{date.today().strftime('%Y')}-{current_user.id[:4].upper() if current_user.id else 'XXXX'}",
                "date": date.today().isoformat(),
                "title": "Contract Analysis Report",
                "legal_notice": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية",
            }
        if "disclaimer" not in parsed:
            parsed["disclaimer"] = "هذه الأداة للمساعدة وليست استشارة قانونية رسمية"

        logger.info(f"Contract analysis completed successfully. Score: {parsed.get('score', 'N/A')}")
        return ContractAnalysisResponse(analysis=parsed)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"analyze_contract error: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"فشل تحليل العقد: {str(e)}")


RESUME_ANALYSIS_PROMPT = """أنت "Salmo Assist HR"، محلل سير ذاتية احترافي متخصص في تقييم المرشحين لسوق العمل السعودي.

مهمتك:
تحليل سيرة ذاتية واحدة وتقديم تقييم رقمي (Score من 100) بناءً على جودة السيرة الذاتية ومدى ملاءمتها للوظيفة المطلوبة.

═══════════════════════════════════════════════════════════════
المرحلة 1: استخراج البيانات (مع درجة الثقة)
═══════════════════════════════════════════════════════════════

استخرج من السيرة الذاتية مع تقييم درجة الثقة (0.0 إلى 1.0) لكل حقل:
- الاسم الكامل
- البريد الإلكتروني
- رقم الهاتف
- الموقع / المدينة
- المؤهل العلمي الأعلى
- سنوات الخبرة الإجمالية
- المهارات الرئيسية (أهم 10)
- اللغات ومستوى كل لغة
- الشهادات الإضافية
- أحدث وظيفة (المسمى والشركة)

معايير درجة الثقة:
- 1.0: المعلومة مذكورة بشكل صريح وواضح
- 0.8-0.9: المعلومة موجودة بوضوح مع غموض بسيط
- 0.6-0.7: المعلومة موجودة جزئياً أو مستنتجة من السياق
- 0.4-0.5: المعلومة مذكورة بشكل غامض
- 0.1-0.3: المعلومة غير واضحة تماماً
- 0.0: المعلومة غير موجودة

ملاحظات للتعامل مع التنسيقات المعقدة:
- السير الذاتية متعددة الأعمدة: استخرج من جميع الأعمدة
- الجداول: حلل البيانات الجدولية بشكل صحيح
- المحتوى ثنائي اللغة (عربي/إنجليزي): تعامل مع كلا اللغتين
- الأقسام غير المعيارية: صنفها ضمن الفئات المعيارية

═══════════════════════════════════════════════════════════════
المرحلة 2: التقييم الرقمي
═══════════════════════════════════════════════════════════════

ابدأ من 100 نقطة، ثم خصم النقاط حسب:

خصم عالي (-10 إلى -20):
- غياب معلومات أساسية (الاسم، المؤهل، الخبرة)
- أخطاء إملائية أو تنسيقية كثيرة
- تناقضات في التواريخ أو المعلومات

خصم متوسط (-5 إلى -10):
- وصف وظيفي غامض أو غير محدد
- غياب المهارات التقنية المطلوبة
- فجوات زمنية غير مبررة

خصم بسيط (-1 إلى -5):
- تنسيق غير احترافي
- غياب معلومات ثانوية (اللغات، الشهادات)
- طول زائد أو قصر شديد

═══════════════════════════════════════════════════════════════
المرحلة 3: مطابقة الوظيفة المرجّحة (إذا وُجد وصف وظيفي)
═══════════════════════════════════════════════════════════════

إذا تم توفير وصف وظيفي، استخدم نظام المطابقة المرجّح:

أوزان المطابقة:
- المهارات التقنية: 40% من الدرجة الإجمالية
  * تطابق تام (نفس المهارة): وزن 1.0
  * مهارة مرتبطة (نفس المجال): وزن 0.5
  * مهارة قابلة للنقل: وزن 0.3
- الخبرة: 30% من الدرجة الإجمالية
  * نفس المجال: وزن 1.0
  * مجال مرتبط: وزن 0.7
  * مجال مختلف: وزن 0.3
- المؤهل العلمي: 20% من الدرجة الإجمالية
  * تطابق تام: وزن 1.0
  * تخصص مرتبط: وزن 0.7
  * تخصص مختلف: وزن 0.3
- المهارات الشخصية واللغات: 10% من الدرجة الإجمالية

احسب:
- match_percentage = مجموع (وزن الفئة × درجة المطابقة) × 100
- حدد المهارات المتطابقة والمفقودة بالتفصيل

إذا لم يتم توفير وصف وظيفي:
- قيّم السيرة الذاتية بشكل عام
- اترك match_percentage كـ null

═══════════════════════════════════════════════════════════════
المرحلة 4: التحليل التفصيلي
═══════════════════════════════════════════════════════════════

لكل جانب:
- نقاط القوة (strengths): ما يميز المرشح
- نقاط الضعف (weaknesses): ما يحتاج تحسين
- فرص التحسين (opportunities): توصيات عملية

═══════════════════════════════════════════════════════════════
المرحلة 5: التوصيات
═══════════════════════════════════════════════════════════════

- هل يُنصح بالمقابلة؟ (recommend_interview)
- مستوى الأولوية (priority: عالية / متوسطة / منخفضة)
- أسئلة مقترحة للمقابلة (3 أسئلة)
- مهارات يُنصح باختبارها

═══════════════════════════════════════════════════════════════
تفسير التقييم:
═══════════════════════════════════════════════════════════════

90 - 100 → ممتاز — مرشح متميز
75 - 89 → جيد — مرشح مناسب
60 - 74 → متوسط — يحتاج تقييم أعمق
أقل من 60 → ضعيف — لا يُنصح

═══════════════════════════════════════════════════════════════
قواعد صارمة:
═══════════════════════════════════════════════════════════════

- لا تخمن معلومات غير موجودة في السيرة الذاتية
- إذا كانت معلومة غير موجودة، اكتب "غير محدد" واجعل درجة الثقة 0.0
- كن موضوعياً في التقييم
- اربط التوصيات بالنتائج
- لا تبالغ في الخصم أو المكافأة
- تعامل مع التنسيقات المعقدة (أعمدة متعددة، جداول، لغات مختلطة)

═══════════════════════════════════════════════════════════════
صيغة الرد الإلزامية (JSON فقط):
═══════════════════════════════════════════════════════════════

يجب أن ترد دائماً بصيغة JSON صالحة فقط، بدون أي نص إضافي قبل أو بعد.

{{
  "type": "resume_analysis",
  "candidate_name": "الاسم المستخرج أو غير محدد",
  "score": 0,
  "score_label": "ممتاز / جيد / متوسط / ضعيف",
  "extracted_info": {{
    "name": "الاسم",
    "email": "البريد",
    "phone": "الهاتف",
    "location": "الموقع",
    "highest_education": "المؤهل الأعلى",
    "total_experience_years": 0,
    "top_skills": ["مهارة 1", "مهارة 2"],
    "languages": ["العربية - ممتاز", "الإنجليزية - جيد"],
    "certifications": ["شهادة 1"],
    "latest_job_title": "المسمى",
    "latest_company": "الشركة"
  }},
  "confidence_scores": {{
    "name": 0.95,
    "email": 0.9,
    "phone": 0.9,
    "location": 0.7,
    "education": 0.85,
    "experience": 0.8,
    "skills": 0.75,
    "languages": 0.7,
    "certifications": 0.6,
    "overall": 0.8
  }},
  "deductions": [
    {{
      "reason": "سبب الخصم",
      "points": -5,
      "category": "عالي / متوسط / بسيط"
    }}
  ],
  "match_analysis": {{
    "match_percentage": 0,
    "matching_skills": ["مهارة متطابقة"],
    "missing_skills": ["مهارة مفقودة"],
    "education_fit": "ممتاز / جيد / متوسط / ضعيف",
    "experience_fit": "ممتاز / جيد / متوسط / ضعيف",
    "weighted_score": 0.0
  }},
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "recommendations": {{
    "recommend_interview": true,
    "priority": "عالية / متوسطة / منخفضة",
    "interview_questions": ["سؤال 1", "سؤال 2", "سؤال 3"],
    "skills_to_test": ["مهارة 1", "مهارة 2"]
  }},
  "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي"
}}

تذكر: ارجع JSON فقط، بدون ```json ولا أي تنسيق إضافي."""


class SingleResumeRequest(BaseModel):
    name: str = ""
    text: str = ""
    job_description: str = ""


@router.post("/analyze-single-resume")
async def analyze_single_resume(
    data: SingleResumeRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Analyze a single resume against an optional job description — lightweight endpoint for frontend per-resume calls"""
    try:
        resume_name = data.name or "سيرة ذاتية"
        resume_text = data.text or ""

        # Truncate very long resumes to avoid payload limits (keep first 8000 chars)
        if len(resume_text) > 8000:
            resume_text = resume_text[:8000] + "\n\n[... تم اقتطاع النص لطوله]"

        if not resume_text.strip():
            return {
                "type": "resume_analysis",
                "candidate_name": resume_name,
                "score": 0,
                "score_label": "غير متاح",
                "extracted_info": {
                    "name": "غير محدد", "email": "غير محدد", "phone": "غير محدد",
                    "location": "غير محدد", "highest_education": "غير محدد",
                    "total_experience_years": 0, "top_skills": [], "languages": [],
                    "certifications": [], "latest_job_title": "غير محدد", "latest_company": "غير محدد",
                },
                "deductions": [{"reason": "نص السيرة الذاتية فارغ", "points": -100, "category": "عالي"}],
                "match_analysis": {"match_percentage": 0, "matching_skills": [], "missing_skills": [], "education_fit": "غير محدد", "experience_fit": "غير محدد"},
                "strengths": [],
                "weaknesses": ["نص السيرة الذاتية فارغ أو غير قابل للقراءة"],
                "recommendations": {"recommend_interview": False, "priority": "منخفضة", "interview_questions": [], "skills_to_test": []},
                "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
            }

        job_desc_section = ""
        if data.job_description and data.job_description.strip():
            job_desc_section = f"\n\n═══ وصف الوظيفة المطلوبة ═══\n{data.job_description.strip()[:3000]}\n═══ نهاية وصف الوظيفة ═══"

        # Try AI analysis — single model, singleton service
        raw_content = ""
        last_ai_err: Exception | None = None

        try:
            service = _get_ai_service()
            ai_messages = [
                ChatMessage(role="system", content=RESUME_ANALYSIS_PROMPT),
                ChatMessage(
                    role="user",
                    content=f"قم بتحليل السيرة الذاتية التالية:{job_desc_section}\n\n═══ السيرة الذاتية: {resume_name} ═══\n{resume_text}\n═══ نهاية السيرة الذاتية ═══",
                ),
            ]
            request = GenTxtRequest(
                messages=ai_messages,
                model="deepseek-v3.2",
                temperature=0.5,
                max_tokens=4096,
            )
            response = await service.gentxt(request)
            raw_content = response.content or ""
            if raw_content:
                logger.info("Single resume analysis succeeded with model: deepseek-v3.2")
        except Exception as ai_err:
            last_ai_err = ai_err
            logger.warning(f"Single resume analysis model deepseek-v3.2 failed: {ai_err}")

        if not raw_content:
            logger.info(f"AI unavailable for resume {resume_name} — using basic fallback")
            word_count = len(resume_text.split())
            has_email = "@" in resume_text
            has_phone = bool(re.search(r'\d{7,}', resume_text))
            fallback_score = min(40, 10 + (15 if has_email else 0) + (10 if has_phone else 0) + min(5, word_count // 50))

            return {
                "type": "resume_analysis",
                "candidate_name": resume_name,
                "score": fallback_score,
                "score_label": "ضعيف (تحليل محدود)",
                "extracted_info": {
                    "name": "غير محدد — التحليل الآلي غير متاح", "email": "غير محدد", "phone": "غير محدد",
                    "location": "غير محدد", "highest_education": "غير محدد",
                    "total_experience_years": 0, "top_skills": [], "languages": [],
                    "certifications": [], "latest_job_title": "غير محدد", "latest_company": "غير محدد",
                },
                "deductions": [{"reason": "تعذر التحليل بالذكاء الاصطناعي — رصيد غير كافٍ", "points": -60, "category": "عالي"}],
                "match_analysis": {"match_percentage": 0, "matching_skills": [], "missing_skills": [], "education_fit": "غير محدد", "experience_fit": "غير محدد"},
                "strengths": ["تم استلام السيرة الذاتية بنجاح"],
                "weaknesses": ["تعذر التحليل التفصيلي بسبب نفاد رصيد الذكاء الاصطناعي"],
                "recommendations": {"recommend_interview": False, "priority": "منخفضة", "interview_questions": [], "skills_to_test": []},
                "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
            }

        # Parse AI response
        raw_content = raw_content.strip()
        if raw_content.startswith("```"):
            raw_content = raw_content.strip("`")
            if raw_content.lower().startswith("json"):
                raw_content = raw_content[4:].strip()

        parsed = None
        try:
            parsed = json.loads(raw_content)
        except Exception:
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if json_match:
                try:
                    parsed = json.loads(json_match.group())
                except Exception:
                    parsed = None

        if not isinstance(parsed, dict):
            parsed = {
                "type": "resume_analysis",
                "candidate_name": resume_name,
                "score": 0,
                "score_label": "غير محدد",
                "extracted_info": {"name": "غير محدد"},
                "deductions": [],
                "match_analysis": {"match_percentage": 0},
                "strengths": [],
                "weaknesses": ["لم يتم تحليل السيرة الذاتية بشكل صحيح"],
                "recommendations": {"recommend_interview": False, "priority": "منخفضة"},
                "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
            }

        if "type" not in parsed:
            parsed["type"] = "resume_analysis"
        if "candidate_name" not in parsed:
            parsed["candidate_name"] = resume_name

        return parsed

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"analyze_single_resume error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل تحليل السيرة الذاتية: {str(e)}")


@router.post("/analyze-resume", response_model=ResumeAnalysisResponse)
async def analyze_resume(
    data: ResumeAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Analyze one or more resumes against an optional job description — 5-stage analysis (batch endpoint, processes one at a time internally)"""
    try:
        if not data.resumes or len(data.resumes) == 0:
            raise HTTPException(status_code=400, detail="لم يتم توفير أي سير ذاتية")
        if len(data.resumes) > 500:
            raise HTTPException(status_code=400, detail="الحد الأقصى 500 سيرة ذاتية")

        job_desc_section = ""
        if data.job_description and data.job_description.strip():
            job_desc_section = f"\n\n═══ وصف الوظيفة المطلوبة ═══\n{data.job_description.strip()[:3000]}\n═══ نهاية وصف الوظيفة ═══"

        results = []
        for idx, resume_item in enumerate(data.resumes):
            resume_name = resume_item.get("name", f"سيرة ذاتية {idx + 1}")
            resume_text = resume_item.get("text", "")

            # Truncate very long resumes to avoid payload limits
            if len(resume_text) > 8000:
                resume_text = resume_text[:8000] + "\n\n[... تم اقتطاع النص لطوله]"

            if not resume_text or not resume_text.strip():
                results.append({
                    "type": "resume_analysis",
                    "candidate_name": resume_name,
                    "score": 0,
                    "score_label": "غير متاح",
                    "extracted_info": {
                        "name": "غير محدد", "email": "غير محدد", "phone": "غير محدد",
                        "location": "غير محدد", "highest_education": "غير محدد",
                        "total_experience_years": 0, "top_skills": [], "languages": [],
                        "certifications": [], "latest_job_title": "غير محدد", "latest_company": "غير محدد",
                    },
                    "deductions": [{"reason": "نص السيرة الذاتية فارغ", "points": -100, "category": "عالي"}],
                    "match_analysis": {"match_percentage": 0, "matching_skills": [], "missing_skills": [], "education_fit": "غير محدد", "experience_fit": "غير محدد"},
                    "strengths": [],
                    "weaknesses": ["نص السيرة الذاتية فارغ أو غير قابل للقراءة"],
                    "recommendations": {"recommend_interview": False, "priority": "منخفضة", "interview_questions": [], "skills_to_test": []},
                    "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
                })
                continue

            # Try AI analysis — single model, singleton service
            raw_content = ""
            last_ai_err: Exception | None = None

            try:
                service = _get_ai_service()
                ai_messages = [
                    ChatMessage(role="system", content=RESUME_ANALYSIS_PROMPT),
                    ChatMessage(
                        role="user",
                        content=f"قم بتحليل السيرة الذاتية التالية:{job_desc_section}\n\n═══ السيرة الذاتية: {resume_name} ═══\n{resume_text}\n═══ نهاية السيرة الذاتية ═══",
                    ),
                ]
                request = GenTxtRequest(
                    messages=ai_messages,
                    model="deepseek-v3.2",
                    temperature=0.5,
                    max_tokens=4096,
                )
                response = await service.gentxt(request)
                raw_content = response.content or ""
                if raw_content:
                    logger.info("Resume analysis succeeded with model: deepseek-v3.2")
            except Exception as ai_err:
                last_ai_err = ai_err
                logger.warning(f"Resume analysis model deepseek-v3.2 failed: {ai_err}")

            if not raw_content:
                logger.info(f"AI unavailable for resume {resume_name} — using basic fallback")
                word_count = len(resume_text.split())
                has_email = "@" in resume_text
                has_phone = bool(re.search(r'\d{7,}', resume_text))
                fallback_score = min(40, 10 + (15 if has_email else 0) + (10 if has_phone else 0) + min(5, word_count // 50))

                results.append({
                    "type": "resume_analysis",
                    "candidate_name": resume_name,
                    "score": fallback_score,
                    "score_label": "ضعيف (تحليل محدود)",
                    "extracted_info": {
                        "name": "غير محدد — التحليل الآلي غير متاح", "email": "غير محدد", "phone": "غير محدد",
                        "location": "غير محدد", "highest_education": "غير محدد",
                        "total_experience_years": 0, "top_skills": [], "languages": [],
                        "certifications": [], "latest_job_title": "غير محدد", "latest_company": "غير محدد",
                    },
                    "deductions": [{"reason": "تعذر التحليل بالذكاء الاصطناعي — رصيد غير كافٍ", "points": -60, "category": "عالي"}],
                    "match_analysis": {"match_percentage": 0, "matching_skills": [], "missing_skills": [], "education_fit": "غير محدد", "experience_fit": "غير محدد"},
                    "strengths": ["تم استلام السيرة الذاتية بنجاح"],
                    "weaknesses": ["تعذر التحليل التفصيلي بسبب نفاد رصيد الذكاء الاصطناعي"],
                    "recommendations": {"recommend_interview": False, "priority": "منخفضة", "interview_questions": [], "skills_to_test": []},
                    "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
                })
                continue

            # Parse AI response
            raw_content = raw_content.strip()
            if raw_content.startswith("```"):
                raw_content = raw_content.strip("`")
                if raw_content.lower().startswith("json"):
                    raw_content = raw_content[4:].strip()

            parsed = None
            try:
                parsed = json.loads(raw_content)
            except Exception:
                json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
                if json_match:
                    try:
                        parsed = json.loads(json_match.group())
                    except Exception:
                        parsed = None

            if not isinstance(parsed, dict):
                parsed = {
                    "type": "resume_analysis",
                    "candidate_name": resume_name,
                    "score": 0,
                    "score_label": "غير محدد",
                    "extracted_info": {"name": "غير محدد"},
                    "deductions": [],
                    "match_analysis": {"match_percentage": 0},
                    "strengths": [],
                    "weaknesses": ["لم يتم تحليل السيرة الذاتية بشكل صحيح"],
                    "recommendations": {"recommend_interview": False, "priority": "منخفضة"},
                    "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
                }

            if "type" not in parsed:
                parsed["type"] = "resume_analysis"
            if "candidate_name" not in parsed:
                parsed["candidate_name"] = resume_name

            results.append(parsed)

        # Sort results by score descending
        results.sort(key=lambda x: x.get("score", 0), reverse=True)

        # Add ranking
        for i, r in enumerate(results):
            r["rank"] = i + 1

        # Build summary
        total = len(results)
        excellent = sum(1 for r in results if r.get("score", 0) >= 90)
        good = sum(1 for r in results if 75 <= r.get("score", 0) < 90)
        average = sum(1 for r in results if 60 <= r.get("score", 0) < 75)
        weak = sum(1 for r in results if r.get("score", 0) < 60)
        recommend_interview = sum(1 for r in results if r.get("recommendations", {}).get("recommend_interview", False))

        summary = {
            "total_resumes": total,
            "score_distribution": {
                "excellent": excellent,
                "good": good,
                "average": average,
                "weak": weak,
            },
            "recommended_for_interview": recommend_interview,
            "top_candidate": results[0].get("candidate_name", "غير محدد") if results else "لا يوجد",
            "top_score": results[0].get("score", 0) if results else 0,
        }

        return ResumeAnalysisResponse(result={
            "type": "resume_batch_analysis",
            "summary": summary,
            "candidates": results,
            "disclaimer": "هذه الأداة للمساعدة وليست قرار توظيف نهائي",
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"analyze_resume error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل تحليل السير الذاتية: {str(e)}")


# ── Arabic stop words for keyword matching ─────────────────────────────────
_STOP_WORDS = {
    "التي", "الذي", "الذين", "اللذان", "اللتان", "اللواتي",
    "على", "عن", "في", "من", "إلى", "مع", "بين", "خلال",
    "ذلك", "هذا", "هذه", "تلك", "هناك", "كل", "بعض",
    "قد", "كان", "كانت", "يكون", "تكون", "ليس", "ليست",
    "أن", "إن", "ما", "لا", "لم", "لن", "هل", "حتى",
    "إذا", "إذ", "بعد", "قبل", "عند", "فوق", "تحت",
    "أو", "ثم", "حيث", "كما", "أي", "أيضا", "غير",
    "ضد", "نحو", "دون", "منذ", "حول", "وفق",
    "المادة", "مادة", "وفقا", "للمادة", "بموجب", "بمقتضى",
    "لأحكام", "أحكام", "حكم", "ينص", "تنص", "يكون", "تكون",
    "له", "لها", "بها", "فيه", "منه", "عليه", "إليه",
    "السعودي", "السعودية", "المملكة", "العربية",
}


def _extract_keywords(text: str) -> set[str]:
    """Extract meaningful keywords from Arabic text."""
    words = set()
    for word in re.split(r'\s+', text):
        w = word.strip()
        if len(w) > 3 and w not in _STOP_WORDS:
            words.add(w.lower())
    return words


def _find_similar_indexed(article: dict, max_similar: int = 3) -> list[dict]:
    """Find articles similar to the given article from the structured index."""
    if not article or not _LAW_ARTICLES_INDEX:
        return []

    text_words = _extract_keywords(article.get("text", ""))
    if not text_words:
        return []

    scored = []
    for other in _LAW_ARTICLES_INDEX:
        if other.get("article_number") == article.get("article_number") and other.get("system") == article.get("system"):
            continue
        other_words = _extract_keywords(other.get("text", ""))
        shared = len(text_words & other_words)
        if shared > 2:
            snippet = other.get("text", "")[:150]
            if len(other.get("text", "")) > 150:
                snippet += "..."
            scored.append({
                "system_name": other.get("system", ""),
                "article_number": str(other.get("article_number", "")),
                "snippet": snippet,
                "chapter": other.get("chapter", ""),
                "section": other.get("section", ""),
                "shared_keywords": shared,
            })

    scored.sort(key=lambda x: x["shared_keywords"], reverse=True)
    return [{k: v for k, v in s.items() if k != "shared_keywords"} for s in scored[:max_similar]]


def _build_result(art: dict, score: int = 100, match_count: int = 1, snippet: str = "", highlighted_snippet: str = "") -> dict:
    """Build a standardized search result from an indexed article."""
    similar = _find_similar_indexed(art, max_similar=3)
    art_text = art.get("text", "")
    result = {
        "system_name": art.get("system", ""),
        "article_number": str(art.get("article_number", "")),
        "article_text": art_text,
        "source": "Salmo Assist",
        "similar_articles": similar,
        "score": score,
        "match_count": match_count,
        "chapter": art.get("chapter", ""),
        "section": art.get("section", ""),
        "cancelled": art.get("cancelled", False),
        "topic": art.get("topic", ""),
    }
    if snippet:
        result["snippet"] = snippet
    if highlighted_snippet:
        result["highlighted_snippet"] = highlighted_snippet
    return result


# ── Topic hierarchy for logical grouping ─────────────────────────────────
# Maps broad topic categories to their sub-topics for hierarchical search
_TOPIC_CATEGORIES = {
    "الإجازات": ["إجازات سنوية", "إجازات مرضية", "إجازات أداء اختبار", "إجازات بدون أجر",
                  "إجازات الأعياد والمناسبات", "إجازة الوضع", "إجازة الرضاعة", "إجازة عدة الوفاة"],
    "إنهاء عقد العمل": ["إنهاء عقد العمل", "إنهاء عقد العمل - فسخ تعسفي", "إنهاء عقد العمل - تعويض الإشعار",
                         "إنهاء عقد العمل - تعويض الفسخ", "إنهاء عقد العمل - إشعار", "إنهاء عقد العمل - الوفاة",
                         "إنهاء عقد العمل - فصل بدون سبب", "إنهاء عقد العمل - ترك العمل",
                         "إنهاء عقد العمل - المرض", "إنهاء عقد العمل - المنافسة"],
    "الأجور": ["الحد الأدنى للأجور", "دفع الأجور", "الخصومات من الأجر", "استرداد الخصومات",
                "الأجر العيني", "الأجر بالقطعة", "التوقيف والاحتجاز"],
    "مكافأة نهاية الخدمة": ["مكافأة نهاية الخدمة", "مكافأة نهاية الخدمة - استقالة",
                              "مكافأة نهاية الخدمة - استثناءات", "مكافأة نهاية الخدمة - تصفية حقوق"],
    "عقود العمل": ["عقد العمل", "فترة التجربة", "انتهاء عقد العمل المحدد", "تجديد عقد العمل",
                     "عقد العمل لعمل معين", "نقل العامل"],
    "ساعات العمل": ["ساعات العمل", "ساعات العمل الإضافية", "العمل بنظام الورديات",
                      "فترات الراحة", "فترات الراحة والصلاة", "العمل المستمر",
                      "الراحة الأسبوعية", "العمل الإضافي", "استثناءات ساعات العمل"],
    "التأديب": ["واجبات أصحاب العمل", "واجبات العمال", "الجزاءات التأديبية", "الجزاءات التأديبية - الغرامات"],
    "تشغيل النساء": ["تشغيل النساء", "إجازة الوضع", "رعاية الحامل", "إجازة الرضاعة",
                       "حماية الحامل والمتعة بإجازة وضع", "تشغيل النساء - مرافق", "تشغيل النساء - دور الحضانة", "إجازة عدة الوفاة"],
    "تشغيل الأحداث": ["تشغيل الأحداث - أعمال خطرة", "تشغيل الأحداث - السن", "تشغيل الأحداث - العمل الليلي",
                        "تشغيل الأحداث - ساعات العمل", "تشغيل الأحداث - المستندات", "تشغيل الأحداث - الإبلاغ", "تشغيل الأحداث - استثناءات"],
    "السلامة والصحة": ["السلامة والصحة المهنية", "المنشآت ذات المخاطر الكبرى", "إصابات العمل",
                         "إصابات العمل - العلاج", "إصابات العمل - التعريف", "إصابات العمل - الانتكاس",
                         "إصابات العمل - عجز مؤقت", "إصابات العمل - عجز دائم أو وفاة", "إصابات العمل - استثناءات",
                         "إصابات العمل - الإبلاغ", "الأمراض المهنية", "الإسعافات الطبية", "الفحص الطبي", "الرعاية الصحية"],
    "التوظيف": ["تنظيم التوظيف", "توظيف ذوي الإعاقة", "مكاتب التوظيف", "تشغيل غير السعوديين"],
    "التدريب": ["التدريب والتأهيل", "عقود التأهيل والتدريب"],
    "تفتيش العمل": ["تفتيش العمل - المفتشون", "تفتيش العمل - شروط المفتش", "تفتيش العمل - مهام المفتش",
                      "تفتيش العمل - التعهد", "تفتيش العمل - صلاحيات", "تفتيش العمل - تعاون أصحاب العمل",
                      "تفتيش العمل - الإبلاغ", "تفتيش العمل - تعليمات", "تفتيش العمل - السرية",
                      "تفتيش العمل - المخالفات", "تفتيش العمل - اختصاصيون", "تفتيش العمل - تقارير",
                      "تفتيش العمل - تقارير سنوية", "تفتيش العمل - نماذج", "تفتيش العمل - تدريب",
                      "تفتيش العمل - اللائحة التنفيذية"],
    "السياسات الداخلية": ["أحكام عامة", "أحكام ختامية", "ضوابط سلوكيات العمل", "واجبات العمال", "واجبات المنشأة", "التظلم", "التفتيش الإداري", "الخدمات الاجتماعية"],
    "المزايا والتعويضات": ["المزايا والبدلات", "العلاوات", "الترقيات", "الإركاب", "الانتداب", "الرعاية الطبية"],
    "إدارة الأداء": ["تقارير الأداء", "المخالفات والجزاءات", "النقل"],
}

# Reverse map: sub-topic → category
_SUBTOPIC_TO_CATEGORY: dict[str, str] = {}
for cat, subs in _TOPIC_CATEGORIES.items():
    for sub in subs:
        _SUBTOPIC_TO_CATEGORY[sub] = cat


def _get_topic_category(topic: str) -> str:
    """Get the broad category for a given topic."""
    if topic in _TOPIC_CATEGORIES:
        return topic
    return _SUBTOPIC_TO_CATEGORY.get(topic, "")


def _match_topic(query: str) -> tuple[str, str]:
    """Try to match a query to a topic category and sub-topic.
    Returns (category, sub_topic) — either may be empty string if no match."""
    q = query.strip()

    # Direct category match
    for cat in _TOPIC_CATEGORIES:
        if cat in q:
            return cat, ""

    # Sub-topic match
    for sub, cat in _SUBTOPIC_TO_CATEGORY.items():
        # Check if the query contains key words from the sub-topic
        sub_words = [w for w in re.split(r'\s+', sub) if len(w) > 2 and w not in _STOP_WORDS]
        if len(sub_words) >= 2:
            matched = sum(1 for w in sub_words if w in q)
            if matched >= len(sub_words) - 1 and matched >= 1:
                return cat, sub
        elif len(sub_words) == 1 and sub_words[0] in q:
            return cat, sub

    # Keyword-based topic detection
    _TOPIC_KEYWORDS = {
        "الإجازات": ["إجازة", "إجازات", "عطلة", "راحة سنوية", "إجازة سنوية", "إجازة مرضية", "إجازة وضع", "إجازة اختبار", "إجازة امتحان"],
        "إنهاء عقد العمل": ["فصل", "طرد", "إنهاء عقد", "فسخ العقد", "تعسفي", "فصل تعسفي", "ترك العمل"],
        "الأجور": ["أجر", "أجور", "راتب", "رواتب", "خصم", "حسم", "تأخير راتب"],
        "مكافأة نهاية الخدمة": ["مكافأة", "نهاية خدمة", "مستحقات", "تعويض نهاية"],
        "عقود العمل": ["عقد عمل", "عقد", "تجربة", "فترة تجربة", "نقل عامل"],
        "ساعات العمل": ["ساعات عمل", "ساعات", "عمل إضافي", "إضافي", "ورديات", "راحة أسبوعية"],
        "التأديب": ["تأديب", "جزاء", "إنذار", "غرامة", "واجبات", "مخالفة"],
        "تشغيل النساء": ["نساء", "امرأة", "حامل", "حمل", "وضع", "رضاعة", "حضانة"],
        "تشغيل الأحداث": ["أحداث", "حدث", "أطفال", "قاصر"],
        "السلامة والصحة": ["سلامة", "صحة مهنية", "إصابة عمل", "إصابات", "مرض مهني", "حادث عمل"],
        "التوظيف": ["توظيف", "تشغيل", "استقدام", "سعودة", "توطين", "عمل للسعوديين"],
        "التدريب": ["تدريب", "تأهيل", "تطوير"],
        "تفتيش العمل": ["تفتيش", "مفتش", "مخالفة عمل"],
    }

    for category, keywords in _TOPIC_KEYWORDS.items():
        for kw in keywords:
            if kw in q:
                return category, ""

    return "", ""


@router.get("/topics")
async def get_topics(
    current_user: UserResponse = Depends(get_current_user),
):
    """List all available legal topic categories with their sub-topics and article counts."""
    try:
        if not _LAW_ARTICLES_INDEX:
            raise HTTPException(status_code=503, detail="قاعدة المعرفة غير متاحة حالياً")

        # Count articles per topic
        from collections import Counter
        topic_counts = Counter(art.get("topic", "") for art in _LAW_ARTICLES_INDEX if art.get("topic"))

        # Build hierarchical response
        categories = []
        for cat_name, sub_topics in _TOPIC_CATEGORIES.items():
            cat_articles = sum(topic_counts.get(sub, 0) for sub in sub_topics)
            subs = []
            for sub in sub_topics:
                count = topic_counts.get(sub, 0)
                if count > 0:
                    subs.append({"name": sub, "article_count": count})
            categories.append({
                "name": cat_name,
                "article_count": cat_articles,
                "sub_topics": subs,
            })

        # Add categories not in the hierarchy (e.g., أحكام عامة, عقد العمل البحري, etc.)
        covered_topics = set()
        for subs in _TOPIC_CATEGORIES.values():
            covered_topics.update(subs)
        covered_topics.update(_TOPIC_CATEGORIES.keys())

        uncategorized = []
        for topic, count in topic_counts.most_common():
            if topic and topic not in covered_topics and not _get_topic_category(topic):
                uncategorized.append({"name": topic, "article_count": count})

        if uncategorized:
            total_uncat = sum(u["article_count"] for u in uncategorized)
            categories.append({
                "name": "أحكام أخرى",
                "article_count": total_uncat,
                "sub_topics": uncategorized,
            })

        return JSONResponse(
            content={
                "total_categories": len(categories),
                "total_articles": len(_LAW_ARTICLES_INDEX),
                "categories": categories,
            },
            headers={"Cache-Control": "public, max-age=3600, s-maxage=7200"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_topics error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل تحميل المواضيع: {str(e)}")


@router.post("/search-kb")
async def search_knowledge_base(
    data: SearchKBRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Enhanced legal search engine for Salmo Assist — uses structured JSON index.
    Supports multiple search modes:
    1. By article number only → returns all matching articles across systems
    2. By system name + article number → exact 100% match
    3. Semantic/text search → top results ranked by relevance
    4. Advanced: "جميع المواد المتعلقة بـ [موضوع]" → extract all related articles
    Strict rules: no interpretation, no summarization, no guessing, source always Salmo Assist
    """
    try:
        if not data.query or not data.query.strip():
            raise HTTPException(status_code=400, detail="كلمة البحث فارغة")

        query = data.query.strip()
        max_results = min(data.max_results, 200)

        cache_key = f"{query}:{max_results}"
        cached = _get_cached_search(cache_key)
        if cached:
            return JSONResponse(content=cached, headers={"Cache-Control": "public, max-age=300, s-maxage=600", "X-Cache": "HIT"})

        if not _LAW_ARTICLES_INDEX:
            raise HTTPException(status_code=503, detail="قاعدة المعرفة غير متاحة حالياً")

        # ── Step 1: Detect search mode ──────────────────────────────────────
        search_mode = "semantic"
        article_number = ""
        system_name = ""
        topic_keyword = ""
        detected_category = ""
        detected_subtopic = ""

        # Check for advanced topic command: "جميع المواد المتعلقة بـ [موضوع]"
        topic_match = re.search(r'جميع\s+المواد\s+المتعلقة\s+بـ?\s*(.+)', query)
        if topic_match:
            search_mode = "topic"
            topic_keyword = topic_match.group(1).strip()
        else:
            # Check for article number pattern: "المادة 77" or just "77" or "مادة 77"
            article_match = re.search(r'(?:المادة\s+|مادة\s+)(\d+)', query)
            if article_match:
                article_number = article_match.group(1)
                system_patterns = [
                    (r'نظام\s+العمل', 'نظام العمل'),
                    (r'اللائحة\s+التنفيذية', 'اللائحة التنفيذية'),
                    (r'نظام\s+العمل\s+السعودي', 'نظام العمل'),
                ]
                for pat, name in system_patterns:
                    if re.search(pat, query):
                        system_name = name
                        break
                if system_name:
                    search_mode = "system_article"
                else:
                    search_mode = "article_number"
            else:
                num_match = re.match(r'^(\d{1,3})$', query)
                if num_match:
                    article_number = num_match.group(1)
                    search_mode = "article_number"
                else:
                    # Try topic detection from query keywords
                    cat, sub = _match_topic(query)
                    if cat:
                        detected_category = cat
                        detected_subtopic = sub
                        search_mode = "topic"
                        topic_keyword = sub if sub else cat
                    else:
                        search_mode = "semantic"

        # ── Step 2: Execute search using structured index ────────────────────
        results: list[dict] = []

        if search_mode == "article_number":
            for art in _LAW_ARTICLES_INDEX:
                if str(art.get("article_number", "")) == article_number:
                    results.append(_build_result(art, score=100, match_count=1))

        elif search_mode == "system_article":
            found = False
            for art in _LAW_ARTICLES_INDEX:
                if str(art.get("article_number", "")) == article_number and system_name in art.get("system", ""):
                    results.append(_build_result(art, score=100, match_count=1))
                    found = True
                    break
            if not found:
                for art in _LAW_ARTICLES_INDEX:
                    if str(art.get("article_number", "")) == article_number:
                        results.append(_build_result(art, score=80, match_count=1))

        elif search_mode == "topic":
            # First try exact topic match from the structured index
            topic_words = [w.strip() for w in re.split(r'\s+', topic_keyword) if len(w.strip()) > 1]
            scored_articles = []

            # Phase 1: Match by topic field (highest priority)
            for art in _LAW_ARTICLES_INDEX:
                art_topic = art.get("topic", "")
                if not art_topic:
                    continue
                # Exact topic match
                if art_topic == topic_keyword:
                    scored_articles.append((art, 1000, 1))
                # Category match: article's topic belongs to the detected category
                elif detected_category and _get_topic_category(art_topic) == detected_category:
                    scored_articles.append((art, 500, 1))
                # Partial topic match
                elif any(w in art_topic for w in topic_words if len(w) > 2):
                    topic_overlap = sum(1 for w in topic_words if w in art_topic and len(w) > 2)
                    scored_articles.append((art, 200 + topic_overlap * 50, topic_overlap))

            # Phase 2: If not enough results, fall back to text search
            if len(scored_articles) < 3:
                existing_nums = {str(a[0].get("article_number", "")) for a in scored_articles}
                for art in _LAW_ARTICLES_INDEX:
                    if str(art.get("article_number", "")) in existing_nums:
                        continue
                    text_lower = (art.get("text", "") + " " + art.get("chapter", "") + " " + art.get("section", "")).lower()
                    score = 0
                    for word in topic_words:
                        word_lower = word.lower()
                        count = text_lower.count(word_lower)
                        if count > 0:
                            score += count * len(word)
                    if score > 0:
                        scored_articles.append((art, score, sum(text_lower.count(w.lower()) for w in topic_words)))

            scored_articles.sort(key=lambda x: x[1], reverse=True)
            for art, score, mc in scored_articles[:max_results]:
                results.append(_build_result(art, score=score, match_count=mc))

        else:
            # Semantic/text search
            query_words = [w.strip() for w in re.split(r'\s+', query) if len(w.strip()) > 1]
            scored_articles = []
            for art in _LAW_ARTICLES_INDEX:
                full_text = art.get("text", "") + " " + art.get("chapter", "") + " " + art.get("section", "")
                text_lower = full_text.lower()
                score = 0
                matched_positions = []
                for word in query_words:
                    word_lower = word.lower()
                    count = text_lower.count(word_lower)
                    if count > 0:
                        score += count * len(word)
                        pos = 0
                        while True:
                            idx = text_lower.find(word_lower, pos)
                            if idx == -1:
                                break
                            matched_positions.append((idx, idx + len(word)))
                            pos = idx + 1
                if score > 0:
                    # Build highlighted snippet
                    snippet = _build_snippet(full_text, matched_positions, query_words)
                    highlighted = _highlight_text(snippet, query_words)
                    scored_articles.append((art, score, len(matched_positions), snippet, highlighted))
            scored_articles.sort(key=lambda x: x[1], reverse=True)
            limit = min(max_results, 20)
            for art, score, mc, snippet, highlighted in scored_articles[:limit]:
                results.append(_build_result(art, score=score, match_count=mc, snippet=snippet, highlighted_snippet=highlighted))

        # ── Step 3: Handle no results ────────────────────────────────────────
        if not results:
            return JSONResponse(
                content={
                    "query": query,
                    "search_mode": search_mode,
                    "article_number": article_number,
                    "system_name": system_name,
                    "topic_keyword": topic_keyword,
                    "detected_category": detected_category,
                    "detected_subtopic": detected_subtopic,
                    "total_matches": 0,
                    "results": [],
                    "not_found_message": "لا توجد مادة مطابقة داخل قاعدة بيانات Salmo Assist",
                },
                headers={"Cache-Control": "public, max-age=300, s-maxage=600"},
            )

        # ── Step 4: Build response ──────────────────────────────────────────
        response_data = {
            "query": query,
            "search_mode": search_mode,
            "article_number": article_number,
            "system_name": system_name,
            "topic_keyword": topic_keyword,
            "detected_category": detected_category,
            "detected_subtopic": detected_subtopic,
            "total_matches": len(results),
            "results": results,
        }
        _set_cached_search(cache_key, response_data)
        return JSONResponse(
            content=response_data,
            headers={"Cache-Control": "public, max-age=300, s-maxage=600"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"search_kb error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل البحث: {str(e)}")


def _build_snippet(
    text: str,
    positions: list[tuple[int, int]],
    query_words: list[str],
    context_chars: int = 200,
) -> str:
    """Build a snippet around the first match position with context."""
    if not positions:
        for word in query_words:
            idx = text.lower().find(word.lower())
            if idx >= 0:
                positions = [(idx, idx + len(word))]
                break

    if not positions:
        return text[:300] + ("..." if len(text) > 300 else "")

    center = positions[0][0]
    start = max(0, center - context_chars)
    end = min(len(text), center + context_chars + (len(query_words[0]) if query_words else 0))

    snippet = ""
    if start > 0:
        snippet += "..."
    snippet += text[start:end]
    if end < len(text):
        snippet += "..."
    return snippet


def _highlight_text(text: str, query_words: list[str]) -> str:
    """Wrap matched keywords in <mark> tags for highlighting."""
    result = text
    for word in query_words:
        if len(word) < 2:
            continue
        pattern = re.compile(re.escape(word), re.IGNORECASE)
        result = pattern.sub(f'<mark>{word}</mark>', result)
    return result


@router.post("/calculate-eosb", response_model=EosbResponse)
async def calculate_eosb(
    data: EosbRequest,
    current_user: UserResponse = Depends(get_current_user),
):
    """Calculate End of Service Benefits (مستحقات نهاية الخدمة) per Saudi Labor Law.
    Supports all 9 official HRSD termination reasons, date-based service calculation,
    early termination compensation, and notice period compensation.
    Backward compatible with legacy fields (monthly_salary, service_years, service_months, reason).
    """
    try:
        # --- Determine effective salary ---
        # Priority: actual_salary > monthly_salary > basic_salary
        effective_salary = data.actual_salary or data.monthly_salary or data.basic_salary
        if effective_salary <= 0:
            raise HTTPException(status_code=400, detail="الراتب يجب أن يكون أكبر من صفر")

        # --- Determine service duration ---
        service_years_calc = data.service_years
        service_months_calc = data.service_months
        service_days_calc = 0
        date_based = False

        start_dt = _parse_date_safe(data.start_date)
        end_dt = _parse_date_safe(data.end_date)

        if start_dt and end_dt:
            if end_dt < start_dt:
                raise HTTPException(status_code=400, detail="تاريخ النهاية يجب أن يكون بعد تاريخ البداية")
            # Calculate precise service duration from dates
            from dateutil.relativedelta import relativedelta
            diff = relativedelta(end_dt, start_dt)
            service_years_calc = diff.years
            service_months_calc = diff.months
            service_days_calc = diff.days
            date_based = True
        elif data.service_years < 0 or data.service_months < 0:
            raise HTTPException(status_code=400, detail="مدة الخدمة يجب أن تكون قيمة موجبة")

        # Total service in years (fractional)
        total_service = service_years_calc + (service_months_calc / 12) + (service_days_calc / 365)

        # --- Validate termination reason ---
        reason_key = data.reason.strip()
        reason_info = _HRSD_REASONS.get(reason_key)
        if not reason_info:
            valid_reasons = [k for k in _HRSD_REASONS.keys() if k not in ("استقالة", "فصل", "انتهاء عقد")]
            raise HTTPException(
                status_code=400,
                detail=f"سبب انتهاء العلاقة غير صالح. الأسباب المقبولة: {', '.join(valid_reasons)}"
            )

        # --- EOSB Calculation (UNCHANGED FORMULA) ---
        first_5_years = min(total_service, 5)
        after_5_years = max(total_service - 5, 0)

        # First 5 years: half salary × years
        eosb_first_5 = first_5_years * (effective_salary / 2)
        # After 5 years: full salary × years
        eosb_after_5 = after_5_years * effective_salary

        gross_eosb = eosb_first_5 + eosb_after_5

        # --- Adjustment based on HRSD reason ---
        adjustment_factor = 1.0
        adjustment_reason = ""
        legal_reference = reason_info["legal_ref"]

        if reason_info["category"] == "no_reward":
            # Article 80 — no reward
            adjustment_factor = 0.0
            adjustment_reason = "فسخ بموجب المادة 80 — لا يستحق مكافأة نهاية الخدمة"
        elif reason_info["category"] == "resignation":
            # Resignation rules (Article 85)
            adjustment_factor, adjustment_reason = _calculate_resignation_factor(total_service)
        elif reason_info["category"] == "full":
            adjustment_factor = 1.0
            adjustment_reason = f"{reason_info['label']} — يستحق كامل المكافأة"

        adjusted_eosb = gross_eosb * adjustment_factor

        # --- Vacation Allowance (UNCHANGED) ---
        daily_wage = effective_salary / 30
        vacation_allowance = daily_wage * data.unused_vacation_days

        # --- Early Termination Compensation (for fixed-term contracts) ---
        compensation = 0.0
        compensation_detail = ""
        contract_type = data.contract_type.strip() if data.contract_type else ""

        if contract_type == "محدد المدة" and data.remaining_contract_months > 0:
            # If employer terminates fixed-term contract early (not Article 80)
            if reason_info["category"] != "no_reward" and reason_key in (
                "فسخ العقد من قبل صاحب العمل",
                "فصل",
            ):
                # Compensation = remaining period salary OR minimum 2 months
                remaining_compensation = data.remaining_contract_months * effective_salary
                min_compensation = 2 * effective_salary
                compensation = max(remaining_compensation, min_compensation)
                compensation_detail = (
                    f"تعويض الإنهاء المبكر للعقد المحدد المدة: "
                    f"المتبقي من العقد ({data.remaining_contract_months} شهر) × الراتب = {remaining_compensation:,.2f} ريال "
                    f"(الحد الأدنى شهرين = {min_compensation:,.2f} ريال)"
                )

        # --- Notice Period Compensation ---
        notice_compensation = 0.0
        notice_detail = ""

        if not data.notice_served:
            # Notice period: 60 days for indefinite contracts, 30 days for fixed-term (remaining < 1 year)
            if contract_type == "غير محدد المدة" or not contract_type:
                notice_days = 60
            else:
                notice_days = 30
            notice_compensation = daily_wage * notice_days
            notice_detail = (
                f"تعويض فترة الإشعار ({notice_days} يوم): "
                f"{daily_wage:,.2f} × {notice_days} = {notice_compensation:,.2f} ريال"
            )

        # --- Total Entitlement ---
        total_entitlement = adjusted_eosb + vacation_allowance + compensation + notice_compensation

        # --- Build result ---
        input_data: dict = {
            "effective_salary": effective_salary,
            "service_years": service_years_calc,
            "service_months": service_months_calc,
            "service_days": service_days_calc,
            "total_service_years": round(total_service, 4),
            "reason": reason_key,
            "reason_label": reason_info["label"],
            "unused_vacation_days": data.unused_vacation_days,
            "contract_type": contract_type or "غير محدد",
            "date_based_calculation": date_based,
            "notice_served": data.notice_served,
        }
        if data.basic_salary > 0:
            input_data["basic_salary"] = data.basic_salary
        if data.actual_salary > 0:
            input_data["actual_salary"] = data.actual_salary
        if data.monthly_salary > 0:
            input_data["monthly_salary"] = data.monthly_salary
        if start_dt:
            input_data["start_date"] = data.start_date
        if end_dt:
            input_data["end_date"] = data.end_date
        if data.remaining_contract_months > 0:
            input_data["remaining_contract_months"] = data.remaining_contract_months

        result = {
            "type": "eosb_calculation",
            "input": input_data,
            "eosb_breakdown": {
                "first_5_years": {
                    "years": round(first_5_years, 2),
                    "rate": "نصف راتب",
                    "calculation": f"{first_5_years:.2f} × ({effective_salary:,.2f} ÷ 2) = {eosb_first_5:,.2f}",
                    "amount": round(eosb_first_5, 2),
                },
                "after_5_years": {
                    "years": round(after_5_years, 2),
                    "rate": "راتب كامل",
                    "calculation": f"{after_5_years:.2f} × {effective_salary:,.2f} = {eosb_after_5:,.2f}",
                    "amount": round(eosb_after_5, 2),
                },
                "gross_eosb": round(gross_eosb, 2),
            },
            "adjustment": {
                "reason": reason_key,
                "reason_label": reason_info["label"],
                "factor": round(adjustment_factor, 4),
                "explanation": adjustment_reason,
                "adjusted_eosb": round(adjusted_eosb, 2),
            },
            "vacation_allowance": {
                "daily_wage": round(daily_wage, 2),
                "unused_days": data.unused_vacation_days,
                "calculation": f"{daily_wage:,.2f} × {data.unused_vacation_days} = {vacation_allowance:,.2f}",
                "amount": round(vacation_allowance, 2),
            },
            "compensation": {
                "early_termination": round(compensation, 2),
                "early_termination_detail": compensation_detail,
                "notice_period": round(notice_compensation, 2),
                "notice_period_detail": notice_detail,
            },
            "deductions": {
                "amount": 0.0,
                "details": [],
                "note": "لا توجد خصومات نظامية حالياً",
            },
            "total_entitlement": round(total_entitlement, 2),
            "legal_reference": {
                "primary_article": legal_reference,
                "eosb_articles": "المادة 84 - حساب مكافأة نهاية الخدمة (نصف راتب لأول 5 سنوات، راتب كامل لما بعدها)",
                "resignation_article": "المادة 85 - مكافأة نهاية الخدمة في حالة الاستقالة" if reason_info["category"] == "resignation" else "",
                "vacation_article": "المادة 111 - بدل الإجازات غير المستخدمة",
                "notice_article": "المادة 75 - فترة الإشعار" if not data.notice_served else "",
                "compensation_article": "المادة 77 - التعويض عن الإنهاء المبكر للعقد المحدد المدة" if compensation > 0 else "",
            },
            "explanation": (
                f"بناءً على راتب فعلي قدره {effective_salary:,.2f} ريال ومدة خدمة {total_service:.2f} سنة، "
                f"وسبب انتهاء العلاقة ({reason_info['label']}): "
                f"مكافأة نهاية الخدمة المعدّلة = {adjusted_eosb:,.2f} ريال"
                f"{f'، تعويض الإنهاء المبكر = {compensation:,.2f} ريال' if compensation > 0 else ''}"
                f"{f'، تعويض الإشعار = {notice_compensation:,.2f} ريال' if notice_compensation > 0 else ''}"
                f"، بدل الإجازات = {vacation_allowance:,.2f} ريال، "
                f"إجمالي المستحقات = {total_entitlement:,.2f} ريال"
            ),
            "next_steps": [
                "تأكد من عقدك ومدة خدمتك الفعلية",
                "اطلب مستحقاتك رسمياً من صاحب العمل",
                "إذا لم يتم الدفع خلال أسبوع، توجه لمكتب العمل لتقديم شكوى",
                "احتفظ بنسخة من العقد وكشف الراتب كإثبات",
            ],
            "disclaimer": "هذه الأداة للمساعدة وليست استشارة قانونية رسمية. الحساب تقريبي وقد يختلف عن الحساب الفعلي حسب تفاصيل العقد.",
        }

        return EosbResponse(result=result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"calculate_eosb error: {e}")
        raise HTTPException(status_code=500, detail=f"فشل حساب المستحقات: {str(e)}")