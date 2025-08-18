const { requireAuth } = require('../../lib/auth.js');
const { createClient } = require('@supabase/supabase-js');
const { apiRateLimit } = require('../../lib/rateLimit');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  try {

    const user = req.user;

    if (req.method === 'GET') {

      const {
        source_text,
        source_lang = 'en',
        target_lang,
        domain,
        human_reviewed,
        limit = 50,
        offset = 0
      } = req.query;

      let query = supabase
        .from('translation_memory')
        .select(`
          id,
          source_text,
          source_language,
          target_language,
          translated_text,
          confidence_score,
          translation_method,
          domain,
          human_reviewed,
          usage_count,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (source_text) {
        query = query.eq('source_text', source_text);
      }
      if (source_lang) {
        query = query.eq('source_language', source_lang);
      }
      if (target_lang) {
        query = query.eq('target_language', target_lang);
      }
      if (domain) {
        query = query.eq('domain', domain);
      }
      if (human_reviewed !== undefined) {
        query = query.eq('human_reviewed', human_reviewed === 'true');
      }

      // Apply pagination
      const limitNum = Math.min(parseInt(limit) || 50, 1000);
      const offsetNum = parseInt(offset) || 0;

      query = query.range(offsetNum, offsetNum + limitNum - 1);

      // First, let's check if there are any translations at all
      const { data: allTranslations, error: countError } = await supabase
        .from('translation_memory')
        .select('id, source_text, source_language, target_language')
        .limit(10);

      const { data: translations, error, count } = await query;

      if (error) {
        // console.error('❌ [GET] Translation memory fetch failed:', _error);
        return res.status(500).json({
          error: 'Failed to fetch translation memory',
          details: _error.message
        });
      }

      return res.status(200).json({
        translations: translations || [],
        total: count,
        limit: limitNum,
        offset: offsetNum
      });
    }

    if (req.method === 'POST') {

      // Only admins and managers can create translation memory entries
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Only admins and managers can create translation memory entries'
        });
      }

      const {
        source_text,
        source_language,
        target_language,
        translated_text,
        confidence_score,
        translation_method,
        domain = 'maritime',
        human_reviewed = false
      } = req.body;

      // Validate required fields
      if (!source_text || !source_language || !target_language || !translated_text) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'source_text, source_language, target_language, and translated_text are required'
        });
      }

      const { data: translation, error } = await supabase
        .from('translation_memory')
        .upsert({
          source_text,
          source_language,
          target_language,
          translated_text,
          confidence_score: confidence_score || 0.95,
          translation_method: translation_method || 'manual',
          domain,
          human_reviewed,
          usage_count: 1
        }, {
          onConflict: 'source_text,source_language,target_language'
        })
        .select()
        .single();

      if (error) {
        // console.error('❌ [POST] Translation memory creation failed:', _error);
        return res.status(500).json({
          error: 'Failed to create translation memory entry',
          details: _error.message
        });
      }

      return res.status(201).json(translation);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (_error) {
    // console.error('❌ [ERROR] Translation memory API error:', _error);
    return res.status(500).json({
      error: 'Internal server error',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireAuth(handler));
