// Quick test script for local Supabase database
const { createClient } = require('@supabase/supabase-js');

// Local Supabase configuration
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLocalDatabase() {
  console.log('🧪 Testing Local Supabase Database');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if workflow tables exist
    console.log('\n1. Testing workflow tables...');
    const tables = [
      'workflows',
      'workflow_phases',
      'workflow_phase_items',
      'workflow_instances',
      'workflow_progress',
      'workflow_pdf_templates'
    ];

    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Table exists and accessible`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Test 2: Create a test workflow
    console.log('\n2. Testing workflow creation...');
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .insert({
        name: 'Local Test Workflow',
        slug: 'local-test-workflow',
        description: 'Testing local Supabase setup',
        type: 'training',
        status: 'active',
        config: { test: true },
        metadata: { test_run: true }
      })
      .select()
      .single();

    if (workflowError) {
      console.log('❌ Workflow creation failed:', workflowError.message);
    } else {
      console.log('✅ Workflow created:', workflow.id);

      // Test 3: Create a test phase
      console.log('\n3. Testing phase creation...');
      const { data: phase, error: phaseError } = await supabase
        .from('workflow_phases')
        .insert({
          workflow_id: workflow.id,
          phase_number: 1,
          name: 'Test Phase',
          description: 'A test phase',
          type: 'content',
          config: {},
          required: true,
          estimated_duration: 15
        })
        .select()
        .single();

      if (phaseError) {
        console.log('❌ Phase creation failed:', phaseError.message);
      } else {
        console.log('✅ Phase created:', phase.id);
      }

      // Clean up
      await supabase.from('workflows').delete().eq('id', workflow.id);
      console.log('✅ Test data cleaned up');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Local database test completed!');
    console.log('✅ Ready to test dynamic workflow system locally');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testLocalDatabase();
}

module.exports = { testLocalDatabase };