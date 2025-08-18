const { requireManagerOrAdmin } = require('../../lib/auth.js');
const { supabase } = require('../../lib/supabase.js');
const { apiRateLimit } = require('../../lib/rateLimit');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = req.user;

    // Test 1: Count workflows
    const { count: totalCount, error: countError } = await supabase
      .from('workflows')
      .select('*', { count: 'exact', head: true });

    // Test 2: Try to fetch workflows without RLS
    const { data: workflows, error: fetchError } = await supabase
      .from('workflows')
      .select('id, name, created_at, created_by')
      .order('created_at', { ascending: false })
      .limit(10);

    // Test 3: Check if user can insert (test RLS)
    const testWorkflow = {
      name: `RLS Test ${Date.now()}`,
      slug: `rls-test-${Date.now()}`,
      description: 'Testing RLS permissions',
      type: 'onboarding',
      status: 'draft',
      created_by: user.userId || user.id,
      updated_by: user.userId || user.id
    };

    const { data: createdWorkflow, error: createError } = await supabase
      .from('workflows')
      .insert([testWorkflow])
      .select()
      .single();

    let canCreate = !createError;

    if (createError) {
      // console.error('❌ [DEBUG] Create error:', createError);
    }

    // Test 4: Check workflow_phases
    const { count: phaseCount, error: phaseCountError } = await supabase
      .from('workflow_phases')
      .select('*', { count: 'exact', head: true });

    // Clean up test workflow if created
    if (createdWorkflow) {
      await supabase
        .from('workflows')
        .delete()
        .eq('id', createdWorkflow.id);
    }

    return res.status(200).json({
      user: {
        id: user.id,
        userId: user.userId,
        email: user.email,
        role: user.role
      },
      database: {
        totalWorkflows: totalCount || 0,
        totalPhases: phaseCount || 0,
        recentWorkflows: workflows?.length || 0,
        canCreateWorkflows: canCreate
      },
      errors: {
        countError: countError?.message,
        fetchError: fetchError?.message,
        createError: createError?.message,
        phaseCountError: phaseCountError?.message
      },
      testResults: {
        createTest: createError ? 'FAILED' : 'PASSED',
        createErrorDetails: createError
      }
    });

  } catch (_error) {
    // console.error('❌ [DEBUG] Unexpected error:', _error);
    return res.status(500).json({
      error: 'Debug failed',
      details: _error.message
    });
  }
}

module.exports = apiRateLimit(requireManagerOrAdmin(handler));
