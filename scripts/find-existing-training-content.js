#!/usr/bin/env node

/**
 * Find existing training content that crew members see
 * This will help us import rich content into the workflow system
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findExistingTrainingContent() {
  console.log('🔍 Finding existing training content that crew members see...\n');

  try {
    // 1. Check training_phases table (where crew content comes from)
    console.log('📚 Checking training_phases table...');
    const { data: trainingPhases, error: phasesError } = await supabase
      .from('training_phases')
      .select('*')
      .order('created_at', { ascending: true });

    if (phasesError) {
      console.error('❌ Error fetching training phases:', phasesError);
      return;
    }

    console.log(`✅ Found ${trainingPhases.length} training phases\n`);

    // 2. Show detailed content for each phase
    trainingPhases.forEach((phase, index) => {
      console.log(`📖 Phase ${index + 1}: ${phase.title || phase.name || 'Untitled'}`);
      console.log(`   ID: ${phase.id}`);
      console.log(`   Description: ${phase.description || 'No description'}`);
      
      if (phase.items && Array.isArray(phase.items)) {
        console.log(`   📝 Items (${phase.items.length}):`);
        phase.items.forEach((item, itemIndex) => {
          console.log(`      ${itemIndex + 1}. ${item.title || item.name || 'Untitled Item'}`);
          if (item.content) {
            console.log(`         Content type: ${typeof item.content}`);
            if (typeof item.content === 'object') {
              console.log(`         Content keys: ${Object.keys(item.content).join(', ')}`);
            }
          }
        });
      } else if (phase.content) {
        console.log(`   📝 Phase Content: ${typeof phase.content}`);
        if (typeof phase.content === 'object') {
          console.log(`      Content keys: ${Object.keys(phase.content).join(', ')}`);
        }
      }
      console.log('');
    });

    // 3. Check current workflow items
    console.log('🔧 Checking current workflow items...');
    const { data: workflowItems, error: itemsError } = await supabase
      .from('workflow_phase_items')
      .select('*')
      .order('item_number', { ascending: true });

    if (itemsError) {
      console.error('❌ Error fetching workflow items:', itemsError);
      return;
    }

    console.log(`✅ Found ${workflowItems.length} workflow items\n`);

    // 4. Show workflow items that need content
    console.log('📋 Current workflow items:');
    workflowItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title || 'Untitled'}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   Has content: ${!!item.content}`);
      console.log(`   Content source: ${item.content_source || 'none'}`);
      console.log(`   Training phase ID: ${item.training_phase_id || 'none'}`);
      console.log('');
    });

    // 5. Suggest matches
    console.log('🎯 Potential content matches:');
    workflowItems.forEach(workflowItem => {
      const potentialMatches = trainingPhases.filter(phase => {
        // Look for title matches
        const phaseTitle = (phase.title || phase.name || '').toLowerCase();
        const itemTitle = (workflowItem.title || '').toLowerCase();
        
        return phaseTitle.includes(itemTitle) || itemTitle.includes(phaseTitle) ||
               (phase.items && phase.items.some(item => 
                 (item.title || item.name || '').toLowerCase().includes(itemTitle) ||
                 itemTitle.includes((item.title || item.name || '').toLowerCase())
               ));
      });

      if (potentialMatches.length > 0) {
        console.log(`📌 "${workflowItem.title}" might match:`);
        potentialMatches.forEach(match => {
          console.log(`   - Training Phase: "${match.title || match.name}"`);
        });
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
findExistingTrainingContent();