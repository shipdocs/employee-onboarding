// Create training items for existing sessions
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Training items for each phase
const trainingItemsByPhase = {
  1: [
    {
      title: "Safety Equipment Familiarization",
      description: "Locate and identify all safety equipment on board including life jackets, fire extinguishers, and emergency exits."
    },
    {
      title: "Emergency Procedures Review",
      description: "Study emergency procedures manual and understand evacuation routes and assembly points."
    },
    {
      title: "Personal Protective Equipment (PPE)",
      description: "Learn proper use and maintenance of personal protective equipment required for maritime operations."
    },
    {
      title: "Fire Safety Training",
      description: "Complete fire safety training including fire prevention, detection, and suppression systems."
    },
    {
      title: "Man Overboard Procedures",
      description: "Learn and practice man overboard emergency response procedures and recovery techniques."
    }
  ],
  2: [
    {
      title: "Vessel Systems Overview",
      description: "Understand main vessel systems including propulsion, electrical, and hydraulic systems."
    },
    {
      title: "Cargo Handling Procedures",
      description: "Learn safe cargo loading, securing, and unloading procedures specific to vessel type."
    },
    {
      title: "Navigation Equipment",
      description: "Familiarize with navigation equipment including GPS, radar, and communication systems."
    },
    {
      title: "Deck Operations",
      description: "Practice deck operations including mooring, anchoring, and line handling procedures."
    },
    {
      title: "Maintenance Procedures",
      description: "Learn routine maintenance procedures and equipment inspection protocols."
    },
    {
      title: "Weather Assessment",
      description: "Understand weather patterns, forecasting, and impact on vessel operations."
    }
  ],
  3: [
    {
      title: "Advanced Navigation",
      description: "Master advanced navigation techniques and electronic chart systems."
    },
    {
      title: "Emergency Response Leadership",
      description: "Develop leadership skills for emergency response and crew coordination."
    },
    {
      title: "Specialized Equipment Operation",
      description: "Learn operation of specialized equipment specific to vessel type and cargo."
    },
    {
      title: "Regulatory Compliance",
      description: "Understand maritime regulations, documentation, and compliance requirements."
    },
    {
      title: "Communication Protocols",
      description: "Master internal and external communication protocols and procedures."
    },
    {
      title: "Final Competency Assessment",
      description: "Complete comprehensive assessment of all training objectives and competencies."
    }
  ]
};

async function createTrainingItems() {
  console.log('📚 Creating training items for existing sessions...');
  
  try {
    // Get all training sessions that don't have items
    const { data: sessions, error: sessionError } = await supabase
      .from('training_sessions')
      .select('id, user_id, phase');
    
    if (sessionError) {
      console.error('❌ Error fetching training sessions:', sessionError);
      return;
    }
    
    console.log(`✅ Found ${sessions.length} training sessions`);
    
    for (const session of sessions) {
      // Check if this session already has items
      const { data: existingItems, error: checkError } = await supabase
        .from('training_items')
        .select('id')
        .eq('session_id', session.id);
      
      if (checkError) {
        console.error(`❌ Error checking items for session ${session.id}:`, checkError);
        continue;
      }
      
      if (existingItems && existingItems.length > 0) {
        console.log(`✅ Session ${session.id} already has ${existingItems.length} items`);
        continue;
      }
      
      // Create training items for this session
      const items = trainingItemsByPhase[session.phase] || [];
      if (items.length === 0) {
        console.log(`⚠️  No items defined for phase ${session.phase}`);
        continue;
      }
      
      const itemsToInsert = items.map((item, index) => ({
        session_id: session.id,
        item_number: (index + 1).toString().padStart(2, '0'),
        title: item.title,
        description: item.description,
        completed: false
      }));
      
      const { error: insertError } = await supabase
        .from('training_items')
        .insert(itemsToInsert);
      
      if (insertError) {
        console.error(`❌ Error creating items for session ${session.id}:`, insertError);
      } else {
        console.log(`✅ Created ${itemsToInsert.length} items for session ${session.id} (Phase ${session.phase})`);
      }
    }
    
    console.log('\n✅ Finished creating training items');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

createTrainingItems();