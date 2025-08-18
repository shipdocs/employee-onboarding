# Translation API Endpoints Documentation

Complete API reference for the multilingual workflow system with AI translation capabilities.

## Base URL
```
Production: https://onboarding.burando.online/api
Development: http://localhost:3000/api
```

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Core Translation Endpoints

### 1. Translate Text
**POST** `/translation/translate-text`

Translate a single text string using AI translation services.

#### Request Body
```json
{
  "text": "Safety training is mandatory for all crew members",
  "sourceLang": "en",
  "targetLang": "nl",
  "domain": "maritime",
  "forceRefresh": false
}
```

#### Parameters
- `text` (string, required): Text to translate
- `sourceLang` (string, required): Source language code (ISO 639-1)
- `targetLang` (string, required): Target language code (ISO 639-1)
- `domain` (string, optional): Domain for specialized translation (`maritime`, `general`)
- `forceRefresh` (boolean, optional): Bypass translation memory cache

#### Response
```json
{
  "translation": "Veiligheidstraining is verplicht voor alle bemanningsleden",
  "confidence": 0.95,
  "provider": "libretranslate",
  "maritimeEnhanced": true,
  "humanReviewed": false,
  "source": "ai",
  "timestamp": "2025-06-06T10:30:00Z"
}
```

#### Error Response
```json
{
  "error": "Translation failed",
  "details": "Source and target languages cannot be the same",
  "code": "INVALID_LANGUAGE_PAIR"
}
```

---

### 2. Batch Translate
**POST** `/translation/batch-translate`

Translate multiple texts to multiple target languages efficiently.

#### Request Body
```json
{
  "texts": [
    "Safety training is mandatory",
    "Emergency procedures must be followed",
    "Life jackets are required"
  ],
  "sourceLang": "en",
  "targetLangs": ["nl", "de", "fr"],
  "domain": "maritime"
}
```

#### Parameters
- `texts` (array, required): Array of texts to translate
- `sourceLang` (string, required): Source language code
- `targetLangs` (array, required): Array of target language codes
- `domain` (string, optional): Domain for specialized translation

#### Response
```json
{
  "results": {
    "nl": [
      {
        "translation": "Veiligheidstraining is verplicht",
        "confidence": 0.95,
        "provider": "libretranslate",
        "maritimeEnhanced": true
      },
      {
        "translation": "Noodprocedures moeten worden gevolgd",
        "confidence": 0.92,
        "provider": "libretranslate",
        "maritimeEnhanced": true
      }
    ],
    "de": [
      {
        "translation": "Sicherheitsschulung ist obligatorisch",
        "confidence": 0.94,
        "provider": "libretranslate",
        "maritimeEnhanced": true
      }
    ]
  },
  "processed_at": "2025-06-06T10:30:00Z",
  "total_texts": 3,
  "total_languages": 2
}
```

---

### 3. Detect Language
**POST** `/translation/detect-language`

Automatically detect the language of provided text.

#### Request Body
```json
{
  "text": "Veiligheidstraining is verplicht voor alle bemanningsleden"
}
```

#### Response
```json
{
  "language": "nl",
  "confidence": 0.98,
  "alternatives": [
    { "language": "de", "confidence": 0.15 },
    { "language": "en", "confidence": 0.08 }
  ]
}
```

---

## Workflow Translation Endpoints

### 4. Translate Workflow
**POST** `/workflows/[slug]/translate`

Translate an entire workflow structure including all phases and items.

#### Request Body
```json
{
  "targetLanguages": ["nl", "de", "fr"],
  "translationMethod": "ai",
  "includePhases": true,
  "includeItems": true
}
```

#### Parameters
- `targetLanguages` (array, required): Languages to translate to
- `translationMethod` (string, optional): Translation method (`ai`, `manual`)
- `includePhases` (boolean, optional): Include phase translations
- `includeItems` (boolean, optional): Include item translations

#### Response
```json
{
  "success": true,
  "workflow": {
    "id": "workflow_123",
    "title": {
      "source_lang": "en",
      "content": {
        "en": "Safety Training Workflow",
        "nl": "Veiligheidstraining Workflow",
        "de": "Sicherheitsschulung Workflow"
      },
      "ai_metadata": {
        "nl": {
          "confidence": 0.95,
          "method": "libretranslate",
          "translated_at": "2025-06-06T10:30:00Z",
          "human_reviewed": false,
          "maritime_enhanced": true
        }
      }
    }
  },
  "languages_added": ["nl", "de", "fr"],
  "translation_job_id": "job_456"
}
```

---

### 5. Get Workflow Translation Status
**GET** `/workflows/[slug]/translation-status`

Get the current translation status of a workflow.

#### Response
```json
{
  "workflow_id": "workflow_123",
  "source_language": "en",
  "supported_languages": ["en", "nl", "de", "fr"],
  "translation_status": "partial",
  "completion_percentage": 75,
  "last_translated_at": "2025-06-06T10:30:00Z",
  "language_status": {
    "en": { "status": "source", "completion": 100 },
    "nl": { "status": "complete", "completion": 100 },
    "de": { "status": "complete", "completion": 100 },
    "fr": { "status": "partial", "completion": 45 }
  }
}
```

---

## Translation Management Endpoints

### 6. Get Translation Memory
**GET** `/translation/memory`

Retrieve translations from the translation memory cache.

#### Query Parameters
- `source_text` (string, optional): Filter by source text
- `source_lang` (string, optional): Filter by source language
- `target_lang` (string, optional): Filter by target language
- `domain` (string, optional): Filter by domain
- `human_reviewed` (boolean, optional): Filter by review status
- `limit` (number, optional): Limit results (default: 50, max: 1000)
- `offset` (number, optional): Offset for pagination

#### Response
```json
{
  "translations": [
    {
      "id": "trans_123",
      "source_text": "Safety training",
      "source_language": "en",
      "target_language": "nl",
      "translated_text": "Veiligheidstraining",
      "confidence_score": 0.95,
      "translation_method": "libretranslate",
      "domain": "maritime",
      "human_reviewed": true,
      "usage_count": 15,
      "created_at": "2025-06-01T10:00:00Z",
      "updated_at": "2025-06-06T10:30:00Z"
    }
  ],
  "total": 245,
  "limit": 50,
  "offset": 0
}
```

---

### 7. Update Translation Review
**PUT** `/translation/memory/[id]/review`

Mark a translation as reviewed and provide feedback.

#### Request Body
```json
{
  "approved": true,
  "feedback": "Translation is accurate and uses proper maritime terminology",
  "quality_rating": 5
}
```

#### Parameters
- `approved` (boolean, required): Whether translation is approved
- `feedback` (string, optional): Review feedback
- `quality_rating` (number, optional): Rating from 1-5

#### Response
```json
{
  "success": true,
  "translation_id": "trans_123",
  "reviewed_by": "user_456",
  "reviewed_at": "2025-06-06T10:30:00Z"
}
```

---

### 8. Maritime Terminology Management
**GET** `/translation/terminology`

Get maritime terminology translations.

#### Query Parameters
- `term_key` (string, optional): Filter by term key
- `source_language` (string, optional): Filter by source language
- `category` (string, optional): Filter by category
- `human_verified` (boolean, optional): Filter by verification status

#### Response
```json
{
  "terms": [
    {
      "id": "term_123",
      "term_key": "safety_training",
      "source_language": "en",
      "translations": {
        "nl": "veiligheidstraining",
        "de": "sicherheitsschulung",
        "fr": "formation sécurité"
      },
      "confidence_scores": {
        "nl": 1.0,
        "de": 1.0,
        "fr": 0.95
      },
      "human_verified": true,
      "category": "training",
      "description": "Mandatory safety education for maritime personnel"
    }
  ]
}
```

---

**POST** `/translation/terminology`

Add new maritime terminology.

#### Request Body
```json
{
  "term_key": "life_boat_drill",
  "source_language": "en",
  "translations": {
    "nl": "reddingsbootoefening",
    "de": "rettungsbootübung",
    "fr": "exercice de canot de sauvetage"
  },
  "category": "emergency_procedures",
  "description": "Regular practice of life boat deployment and evacuation procedures"
}
```

#### Response
```json
{
  "success": true,
  "term_id": "term_789",
  "term_key": "life_boat_drill",
  "created_at": "2025-06-06T10:30:00Z"
}
```

---

## Translation Jobs & Monitoring

### 9. Get Translation Jobs
**GET** `/translation/jobs`

Get list of translation jobs with their status.

#### Query Parameters
- `status` (string, optional): Filter by status (`pending`, `processing`, `completed`, `failed`)
- `target_table` (string, optional): Filter by target table
- `started_by` (string, optional): Filter by user ID
- `limit` (number, optional): Limit results

#### Response
```json
{
  "jobs": [
    {
      "id": "job_123",
      "job_type": "workflow",
      "target_id": "workflow_456",
      "target_table": "workflows",
      "source_language": "en",
      "target_languages": ["nl", "de", "fr"],
      "status": "processing",
      "progress_percentage": 65,
      "total_items": 20,
      "completed_items": 13,
      "failed_items": 0,
      "started_by": "user_789",
      "started_at": "2025-06-06T10:00:00Z",
      "estimated_completion": "2025-06-06T10:45:00Z"
    }
  ]
}
```

---

### 10. Get Translation Job Details
**GET** `/translation/jobs/[id]`

Get detailed information about a specific translation job.

#### Response
```json
{
  "id": "job_123",
  "job_type": "workflow",
  "target_id": "workflow_456",
  "target_table": "workflows",
  "source_language": "en",
  "target_languages": ["nl", "de", "fr"],
  "status": "processing",
  "progress_percentage": 65,
  "total_items": 20,
  "completed_items": 13,
  "failed_items": 0,
  "error_messages": [],
  "started_by": "user_789",
  "started_at": "2025-06-06T10:00:00Z",
  "processing_details": {
    "current_phase": "translating_items",
    "items_remaining": 7,
    "average_time_per_item": "2.5s"
  }
}
```

---

## Quality & Analytics Endpoints

### 11. Translation Quality Metrics
**GET** `/translation/quality/metrics`

Get translation quality metrics and analytics.

#### Query Parameters
- `language_pair` (string, optional): Language pair (e.g., 'en-nl')
- `date_from` (string, optional): Start date (ISO format)
- `date_to` (string, optional): End date (ISO format)
- `domain` (string, optional): Domain filter

#### Response
```json
{
  "metrics": {
    "total_translations": 1250,
    "average_confidence": 0.92,
    "human_review_rate": 0.18,
    "accuracy_score": 0.94,
    "user_satisfaction_score": 4.3,
    "language_pairs": {
      "en-nl": {
        "count": 450,
        "avg_confidence": 0.94,
        "review_rate": 0.15
      },
      "en-de": {
        "count": 380,
        "avg_confidence": 0.91,
        "review_rate": 0.22
      }
    }
  },
  "trends": {
    "daily_translation_count": [
      { "date": "2025-06-01", "count": 45 },
      { "date": "2025-06-02", "count": 52 }
    ],
    "confidence_improvement": 0.08
  }
}
```

---

### 12. User Translation Activity
**GET** `/translation/activity`

Get user translation activity and statistics.

#### Query Parameters
- `user_id` (string, optional): Filter by user ID
- `activity_type` (string, optional): Activity type filter
- `date_from` (string, optional): Start date
- `date_to` (string, optional): End date

#### Response
```json
{
  "activities": [
    {
      "id": "activity_123",
      "user_id": "user_456",
      "activity_type": "review",
      "source_language": "en",
      "target_language": "nl",
      "content_type": "workflow",
      "content_id": "workflow_789",
      "quality_rating": 5,
      "feedback": "Excellent maritime terminology usage",
      "created_at": "2025-06-06T10:30:00Z"
    }
  ],
  "summary": {
    "total_activities": 45,
    "reviews_completed": 23,
    "translations_created": 15,
    "average_quality_rating": 4.2
  }
}
```

---

## Language Management Endpoints

### 13. Get Supported Languages
**GET** `/translation/languages`

Get list of supported languages and their capabilities.

#### Response
```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "native_name": "English",
      "flag": "🇺🇸",
      "is_source": true,
      "translation_quality": "native",
      "maritime_terminology_coverage": 100
    },
    {
      "code": "nl",
      "name": "Dutch",
      "native_name": "Nederlands",
      "flag": "🇳🇱",
      "is_source": false,
      "translation_quality": "excellent",
      "maritime_terminology_coverage": 95
    }
  ],
  "default_language": "en",
  "total_language_pairs": 20
}
```

---

### 14. Update User Language Preferences
**PUT** `/translation/preferences`

Update user's language preferences and translation settings.

#### Request Body
```json
{
  "preferred_language": "nl",
  "fallback_languages": ["en", "de"],
  "auto_translate_content": true,
  "translation_quality_preference": "balanced",
  "notification_languages": ["nl", "en"]
}
```

#### Response
```json
{
  "success": true,
  "user_id": "user_123",
  "preferences": {
    "preferred_language": "nl",
    "fallback_languages": ["en", "de"],
    "auto_translate_content": true,
    "translation_quality_preference": "balanced",
    "notification_languages": ["nl", "en"]
  },
  "updated_at": "2025-06-06T10:30:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_LANGUAGE_PAIR` | Source and target languages are invalid |
| `TRANSLATION_SERVICE_UNAVAILABLE` | Translation service is down |
| `RATE_LIMIT_EXCEEDED` | Too many translation requests |
| `INSUFFICIENT_PERMISSIONS` | User lacks translation permissions |
| `WORKFLOW_NOT_FOUND` | Specified workflow doesn't exist |
| `TRANSLATION_JOB_FAILED` | Translation job encountered errors |
| `INVALID_TRANSLATION_METHOD` | Unsupported translation method |
| `TERMINOLOGY_NOT_FOUND` | Maritime term not in database |
| `QUALITY_THRESHOLD_NOT_MET` | Translation quality below threshold |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Individual Translation | 100 requests | 1 minute |
| Batch Translation | 10 requests | 1 minute |
| Workflow Translation | 5 requests | 5 minutes |
| Quality Metrics | 50 requests | 1 minute |
| Terminology Management | 20 requests | 1 minute |

---

## Webhook Events

The system can send webhook notifications for translation events:

### Translation Completed
```json
{
  "event": "translation.completed",
  "data": {
    "job_id": "job_123",
    "workflow_id": "workflow_456", 
    "languages_completed": ["nl", "de"],
    "total_items_translated": 15,
    "average_confidence": 0.92,
    "completed_at": "2025-06-06T10:30:00Z"
  }
}
```

### Translation Failed
```json
{
  "event": "translation.failed",
  "data": {
    "job_id": "job_123",
    "error": "Translation service unavailable",
    "failed_languages": ["fr"],
    "retry_available": true,
    "failed_at": "2025-06-06T10:30:00Z"
  }
}
```

### Quality Review Required
```json
{
  "event": "translation.review_required",
  "data": {
    "translation_id": "trans_123",
    "source_text": "Emergency assembly point",
    "target_language": "nl",
    "confidence": 0.75,
    "reason": "low_confidence",
    "workflow_id": "workflow_456"
  }
}
```

---

This API documentation provides complete coverage of all translation-related endpoints in the multilingual workflow system, enabling developers to integrate AI-powered translation capabilities seamlessly into maritime onboarding workflows.