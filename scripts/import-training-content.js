#!/usr/bin/env node

/**
 * Import existing training content into workflow items
 * This will link the rich content that crew members see to the workflow system
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

// Manual mapping of workflow items to training content
const CONTENT_MAPPINGS = [
  {
    workflowItemTitle: "Meet colleagues + daily affairs on board",
    trainingPhaseId: null, // Will be filled in after we find the content
    trainingItemNumber: null,
    description: "Introduction to crew members and daily routines"
  },
  {
    workflowItemTitle: "Emergency response system Red Book",
    trainingPhaseId: null,
    trainingItemNumber: null,
    description: "Emergency procedures and response protocols"
  },
  {
    workflowItemTitle: "Smoke and fire prohibition",
    trainingPhaseId: null,
    trainingItemNumber: null,
    description: "Fire safety and smoking regulations"
  },
  {
    workflowItemTitle: "Written instructions",
    trainingPhaseId: null,
    trainingItemNumber: null,
    description: "Documentation and written procedures"
  }
];

async function importTrainingContent(dryRun = true) {
  console.log(`🔄 ${dryRun ? 'DRY RUN:' : 'EXECUTING:'} Import training content into workflow items...\n`);

  try {
    // 1. Get all training phases
    const { data: trainingPhases, error: phasesError } = await supabase
      .from('training_phases')
      .select('*');

    if (phasesError) {
      console.error('❌ Error fetching training phases:', phasesError);
      return;
    }

    // 2. Get all workflow items
    const { data: workflowItems, error: itemsError } = await supabase
      .from('workflow_phase_items')
      .select('*');

    if (itemsError) {
      console.error('❌ Error fetching workflow items:', itemsError);
      return;
    }

    console.log(`📚 Found ${trainingPhases.length} training phases`);
    console.log(`🔧 Found ${workflowItems.length} workflow items\n`);

    // 3. Process each workflow item
    for (const workflowItem of workflowItems) {
      console.log(`🔍 Processing: "${workflowItem.title}"`);

      // Find matching training content
      let matchedPhase = null;
      let matchedItem = null;

      // Look for exact title matches first
      for (const phase of trainingPhases) {
        if (phase.items && Array.isArray(phase.items)) {
          for (const item of phase.items) {
            const itemTitle = (item.title || item.name || '').toLowerCase();
            const workflowTitle = workflowItem.title.toLowerCase();

            if (itemTitle.includes(workflowTitle) || workflowTitle.includes(itemTitle)) {
              matchedPhase = phase;
              matchedItem = item;
              break;
            }
          }
        }
        if (matchedPhase) break;

        // Also check phase-level matches
        const phaseTitle = (phase.title || phase.name || '').toLowerCase();
        const workflowTitle = workflowItem.title.toLowerCase();
        if (phaseTitle.includes(workflowTitle) || workflowTitle.includes(phaseTitle)) {
          matchedPhase = phase;
          matchedItem = phase; // Use the phase itself as the item
          break;
        }
      }

      if (matchedPhase && matchedItem) {
        console.log(`   ✅ Found match in phase: "${matchedPhase.title || matchedPhase.name}"`);
        console.log(`   📝 Item: "${matchedItem.title || matchedItem.name || 'Phase content'}"`);

        // Prepare the update
        const updateData = {
          content_source: 'training_reference',
          training_phase_id: matchedPhase.id,
          training_item_number: matchedItem.item_number || 1,
          enriched_content: matchedItem.content || matchedItem,
          updated_at: new Date().toISOString()
        };

        if (dryRun) {
          console.log(`   🔄 Would update with:`, {
            content_source: updateData.content_source,
            training_phase_id: updateData.training_phase_id,
            training_item_number: updateData.training_item_number,
            has_enriched_content: !!updateData.enriched_content
          });
        } else {
          // Actually perform the update
          const { error: updateError } = await supabase
            .from('workflow_phase_items')
            .update(updateData)
            .eq('id', workflowItem.id);

          if (updateError) {
            console.error(`   ❌ Error updating item:`, updateError);
          } else {
            console.log(`   ✅ Successfully updated workflow item`);
          }
        }
      } else {
        console.log(`   ⚠️  No matching training content found`);
      }
      console.log('');
    }

    if (dryRun) {
      console.log('\n🔄 This was a dry run. To actually import the content, run:');
      console.log('node scripts/import-training-content.js --execute');
    } else {
      console.log('\n✅ Training content import completed!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

// Run the script
importTrainingContent(dryRun);