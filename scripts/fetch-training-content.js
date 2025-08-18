#!/usr/bin/env node

/**
 * Fetch Training Content Script
 * 
 * This script fetches the rich training content that crew members see
 * and shows how to link it to workflow items for admin editing.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchTrainingContent() {
  console.log('🔍 Fetching training content that crew members see...\n');

  try {
    // 1. Fetch all training phases with rich content
    const { data: trainingPhases, error: phasesError } = await supabase
      .from('training_phases')
      .select('*')
      .eq('status', 'published')
      .order('phase_number');

    if (phasesError) {
      throw phasesError;
    }

    console.log(`📚 Found ${trainingPhases.length} training phases:\n`);

    trainingPhases.forEach((phase, index) => {
      console.log(`${index + 1}. Phase ${phase.phase_number}: ${phase.phase_name}`);
      console.log(`   ID: ${phase.id}`);
      console.log(`   Items: ${phase.items ? phase.items.length : 0}`);
      
      if (phase.items && phase.items.length > 0) {
        phase.items.forEach((item, itemIndex) => {
          console.log(`   ${itemIndex + 1}. ${item.title || 'Untitled'}`);
          if (item.overview) {
            console.log(`      Overview: ${item.overview.substring(0, 100)}...`);
          }
          if (item.objectives && item.objectives.length > 0) {
            console.log(`      Objectives: ${item.objectives.length} items`);
          }
          if (item.keyPoints && item.keyPoints.length > 0) {
            console.log(`      Key Points: ${item.keyPoints.length} items`);
          }
          if (item.procedures && item.procedures.length > 0) {
            console.log(`      Procedures: ${item.procedures.length} items`);
          }
        });
      }
      console.log('');
    });

    // 2. Fetch current workflow items to see what needs linking
    const { data: workflowItems, error: workflowError } = await supabase
      .from('workflow_phase_items')
      .select(`
        id,
        title,
        content_source,
        training_phase_id,
        training_item_number,
        workflow_phases!inner(
          workflow_id,
          workflows!inner(name)
        )
      `)
      .order('created_at');

    if (workflowError) {
      throw workflowError;
    }

    console.log(`🔧 Found ${workflowItems.length} workflow items:\n`);

    const linkedItems = workflowItems.filter(item => item.content_source === 'training_reference');
    const unlinkedItems = workflowItems.filter(item => item.content_source !== 'training_reference');

    console.log(`✅ Linked to training content: ${linkedItems.length}`);
    console.log(`❌ Not linked to training content: ${unlinkedItems.length}\n`);

    if (unlinkedItems.length > 0) {
      console.log('🔗 Workflow items that could be linked to training content:\n');
      
      unlinkedItems.forEach((item, index) => {
        console.log(`${index + 1}. "${item.title}"`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Workflow: ${item.workflow_phases.workflows.name}`);
        console.log(`   Current source: ${item.content_source || 'inline'}`);
        
        // Try to find matching training content
        const potentialMatches = [];
        trainingPhases.forEach(phase => {
          if (phase.items) {
            phase.items.forEach((trainingItem, itemIndex) => {
              if (trainingItem.title && item.title) {
                const similarity = calculateSimilarity(
                  trainingItem.title.toLowerCase(),
                  item.title.toLowerCase()
                );
                if (similarity > 0.5) {
                  potentialMatches.push({
                    phase,
                    item: trainingItem,
                    itemIndex: itemIndex + 1,
                    similarity
                  });
                }
              }
            });
          }
        });

        if (potentialMatches.length > 0) {
          console.log(`   🎯 Potential matches:`);
          potentialMatches
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .forEach(match => {
              console.log(`      - Phase ${match.phase.phase_number}, Item ${match.itemIndex}: "${match.item.title}" (${Math.round(match.similarity * 100)}% match)`);
            });
        } else {
          console.log(`   ❓ No obvious training content matches found`);
        }
        console.log('');
      });
    }

    // 3. Show example of how to link workflow items to training content
    console.log('🔧 Example: How to link workflow items to training content:\n');
    
    if (unlinkedItems.length > 0 && trainingPhases.length > 0) {
      const exampleWorkflowItem = unlinkedItems[0];
      const exampleTrainingPhase = trainingPhases[0];
      
      console.log('SQL to link a workflow item to training content:');
      console.log('```sql');
      console.log(`UPDATE workflow_phase_items SET`);
      console.log(`  content_source = 'training_reference',`);
      console.log(`  training_phase_id = '${exampleTrainingPhase.id}',`);
      console.log(`  training_item_number = 1`);
      console.log(`WHERE id = '${exampleWorkflowItem.id}';`);
      console.log('```\n');

      console.log('API call to link workflow item to training content:');
      console.log('```javascript');
      console.log(`await workflowService.linkTrainingContent('${exampleWorkflowItem.id}', {`);
      console.log(`  training_phase_id: '${exampleTrainingPhase.id}',`);
      console.log(`  training_item_number: 1`);
      console.log(`});`);
      console.log('```\n');
    }

    // 4. Show rich content example
    if (trainingPhases.length > 0 && trainingPhases[0].items && trainingPhases[0].items.length > 0) {
      const exampleItem = trainingPhases[0].items[0];
      console.log('📋 Example of rich training content structure:\n');
      console.log('```json');
      console.log(JSON.stringify({
        title: exampleItem.title,
        overview: exampleItem.overview,
        objectives: exampleItem.objectives,
        keyPoints: exampleItem.keyPoints,
        procedures: exampleItem.procedures
      }, null, 2));
      console.log('```\n');
    }

    console.log('✅ Training content analysis complete!');
    console.log('\n🎯 Next steps:');
    console.log('1. Use the TrainingContentEditor to link workflow items to training content');
    console.log('2. Test the "Link Training Content" functionality in the admin interface');
    console.log('3. Verify that linked items show rich content like crew members see');

  } catch (error) {
    console.error('❌ Error fetching training content:', error);
    process.exit(1);
  }
}

// Simple string similarity function
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Run the script
fetchTrainingContent().catch(console.error);