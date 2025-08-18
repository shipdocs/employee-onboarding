#!/usr/bin/env node

/**
 * Link Training Content Script
 * 
 * This script automatically links workflow items to their matching training content
 * so that admins can see the same rich content that crew members see.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Perfect matches found from the analysis
const PERFECT_MATCHES = [
  {
    workflowItemTitle: "Policy Social Media",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 15
  },
  {
    workflowItemTitle: "Smoke and fire prohibition",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 3
  },
  {
    workflowItemTitle: "Written instructions",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 4
  },
  {
    workflowItemTitle: "Meet colleagues + daily affairs on board",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 1
  },
  {
    workflowItemTitle: "Lifebuoys",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 11
  },
  {
    workflowItemTitle: "Lifejackets",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 12
  },
  {
    workflowItemTitle: "Lifeboat",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 13
  },
  {
    workflowItemTitle: "General alarm",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 17
  },
  {
    workflowItemTitle: "Reporting incidents, near miss and deviations to the captain",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 18
  },
  {
    workflowItemTitle: "Emergency response system Red Book",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 2
  },
  {
    workflowItemTitle: "Company regulations (Appendix 07-01)",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 14
  },
  {
    workflowItemTitle: "Personal Protection Equipment",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 5
  },
  {
    workflowItemTitle: "Fire extinguishing equipment",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 6
  },
  {
    workflowItemTitle: "Fire extinguishing system engine rooms",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 7
  },
  {
    workflowItemTitle: "Emergency shutoff valves bunker tanks",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 8
  },
  {
    workflowItemTitle: "Respiratory filter + knowledge of use + escape masks",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 9
  },
  {
    workflowItemTitle: "Emergency eye wash station / bottle",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 10
  },
  {
    workflowItemTitle: "Alcohol and drugs policy",
    trainingPhaseId: "71563972-4622-4bcd-ae88-3406bb4528d1",
    trainingItemNumber: 16
  }
];

async function linkTrainingContent(dryRun = true) {
  console.log('🔗 Linking workflow items to training content...\n');
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Fetch all workflow items
    const { data: workflowItems, error: workflowError } = await supabase
      .from('workflow_phase_items')
      .select('id, title, content_source')
      .order('title');

    if (workflowError) {
      throw workflowError;
    }

    console.log(`📋 Found ${workflowItems.length} workflow items\n`);

    let linkedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const match of PERFECT_MATCHES) {
      const workflowItem = workflowItems.find(item => 
        item.title === match.workflowItemTitle
      );

      if (!workflowItem) {
        console.log(`❌ Workflow item not found: "${match.workflowItemTitle}"`);
        errorCount++;
        continue;
      }

      if (workflowItem.content_source === 'training_reference') {
        console.log(`⏭️  Already linked: "${match.workflowItemTitle}"`);
        skippedCount++;
        continue;
      }

      console.log(`🔗 Linking: "${match.workflowItemTitle}"`);
      console.log(`   → Training Phase: ${match.trainingPhaseId}`);
      console.log(`   → Item Number: ${match.trainingItemNumber}`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('workflow_phase_items')
          .update({
            content_source: 'training_reference',
            training_phase_id: match.trainingPhaseId,
            training_item_number: match.trainingItemNumber
          })
          .eq('id', workflowItem.id);

        if (updateError) {
          console.log(`   ❌ Error: ${updateError.message}`);
          errorCount++;
        } else {
          console.log(`   ✅ Successfully linked!`);
          linkedCount++;
        }
      } else {
        console.log(`   🧪 Would link (dry run)`);
        linkedCount++;
      }
      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`   ✅ Linked: ${linkedCount}`);
    console.log(`   ⏭️  Skipped (already linked): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📋 Total matches: ${PERFECT_MATCHES.length}\n`);

    if (dryRun) {
      console.log('🚀 To apply these changes, run:');
      console.log('   node scripts/link-training-content.js --apply\n');
    } else {
      console.log('✅ Training content linking complete!\n');
      console.log('🎯 Next steps:');
      console.log('1. Refresh the admin flows page');
      console.log('2. Edit a workflow item to see the rich training content');
      console.log('3. Verify that the TrainingContentEditor shows the same content crew members see');
    }

  } catch (error) {
    console.error('❌ Error linking training content:', error);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const applyChanges = args.includes('--apply');

// Run the script
linkTrainingContent(!applyChanges).catch(console.error);