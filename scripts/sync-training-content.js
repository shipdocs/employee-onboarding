#!/usr/bin/env node

/**
 * Training Content Synchronization Script
 * 
 * This script synchronizes rich content from training_items table to training_phases table
 * so that admins see the same rich content that crew members see.
 * 
 * Problem: Crew members see rich content from training_items, but admins see limited content from training_phases
 * Solution: Copy rich content from training_items to training_phases for consistency
 */

const { supabase } = require('../lib/database-supabase-compat');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ocqnnyxnqaedarcohywe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Main synchronization function
 */
async function syncTrainingContent() {
  console.log('🔄 Starting training content synchronization...');
  console.log('📊 Copying rich content from training_items to training_phases\n');

  try {
    // Step 1: Get all training items with rich content
    console.log('📋 Step 1: Fetching training items with rich content...');
    const { data: trainingItems, error: itemsError } = await supabase
      .from('training_items')
      .select('session_id, item_number, title, description, content, category')
      .not('content', 'is', null);

    if (itemsError) {
      throw new Error(`Failed to fetch training items: ${itemsError.message}`);
    }

    console.log(`✅ Found ${trainingItems.length} training items with rich content`);

    // Step 2: Get all training phases
    console.log('\n📋 Step 2: Fetching training phases...');
    const { data: trainingPhases, error: phasesError } = await supabase
      .from('training_phases')
      .select('id, phase_number, title, items')
      .order('phase_number');

    if (phasesError) {
      throw new Error(`Failed to fetch training phases: ${phasesError.message}`);
    }

    console.log(`✅ Found ${trainingPhases.length} training phases`);

    // Step 3: Group training items by phase (inferred from session)
    console.log('\n📋 Step 3: Mapping training items to phases...');
    
    // Get session to phase mapping
    const sessionsResult = await db.query('SELECT id, phase FROM training_sessions');
    const sessions = sessionsResult.rows;
    const sessionsError = false;

    if (sessionsError) {
      throw new Error(`Failed to fetch training sessions: ${sessionsError.message}`);
    }

    // Create session to phase mapping
    const sessionToPhase = {};
    sessions.forEach(session => {
      sessionToPhase[session.id] = session.phase;
    });

    // Group items by phase
    const itemsByPhase = {};
    trainingItems.forEach(item => {
      const phase = sessionToPhase[item.session_id];
      if (phase) {
        if (!itemsByPhase[phase]) {
          itemsByPhase[phase] = [];
        }
        itemsByPhase[phase].push(item);
      }
    });

    console.log('✅ Mapped training items to phases:');
    Object.keys(itemsByPhase).forEach(phase => {
      console.log(`   Phase ${phase}: ${itemsByPhase[phase].length} items`);
    });

    // Step 4: Synchronize content for each phase
    console.log('\n📋 Step 4: Synchronizing content...');
    
    for (const trainingPhase of trainingPhases) {
      const phaseNumber = trainingPhase.phase_number;
      const phaseItems = itemsByPhase[phaseNumber] || [];
      
      console.log(`\n🔄 Processing Phase ${phaseNumber}: ${trainingPhase.title}`);
      
      if (phaseItems.length === 0) {
        console.log(`   ⚠️  No training items found for phase ${phaseNumber}`);
        continue;
      }

      // Update the items in the training phase
      const updatedItems = trainingPhase.items.map(existingItem => {
        // Find matching training item by item number
        const matchingItem = phaseItems.find(item => 
          item.item_number.toString().padStart(2, '0') === existingItem.number ||
          item.item_number.toString() === existingItem.number
        );

        if (matchingItem && matchingItem.content) {
          console.log(`   ✅ Updating item ${existingItem.number}: ${existingItem.title}`);
          return {
            ...existingItem,
            content: matchingItem.content,
            title: matchingItem.title || existingItem.title,
            description: matchingItem.description || existingItem.description,
            category: matchingItem.category || existingItem.category
          };
        } else {
          console.log(`   ⚠️  No rich content found for item ${existingItem.number}: ${existingItem.title}`);
          return existingItem;
        }
      });

      // Update the training phase in the database
      const { error: updateError } = await supabase
        .from('training_phases')
        .update({
          items: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', trainingPhase.id);

      if (updateError) {
        console.error(`   ❌ Error updating phase ${phaseNumber}:`, updateError);
      } else {
        const updatedCount = updatedItems.filter(item => item.content).length;
        console.log(`   ✅ Successfully updated phase ${phaseNumber} with ${updatedCount} rich content items`);
      }
    }

    // Step 5: Validation
    console.log('\n📋 Step 5: Validating synchronization...');
    const { data: updatedPhases, error: validationError } = await supabase
      .from('training_phases')
      .select('phase_number, title, items')
      .order('phase_number');

    if (validationError) {
      throw new Error(`Validation failed: ${validationError.message}`);
    }

    console.log('\n📊 Synchronization Results:');
    updatedPhases.forEach(phase => {
      const richContentItems = phase.items.filter(item => item.content).length;
      const totalItems = phase.items.length;
      console.log(`   Phase ${phase.phase_number}: ${richContentItems}/${totalItems} items with rich content`);
    });

    console.log('\n✅ Training content synchronization completed successfully!');
    console.log('🎯 Admins should now see the same rich content that crew members see.');

  } catch (error) {
    console.error('\n❌ Synchronization failed:', error.message);
    process.exit(1);
  }
}

// Run the synchronization
syncTrainingContent();
