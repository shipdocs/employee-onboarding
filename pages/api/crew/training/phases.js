import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '../../../../utils/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authResult = await verifyToken(req);
    if (!authResult.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🔍 [API] Getting all training phases for content import...');

    // Get all training phases with their content
    const { data: trainingPhases, error } = await supabase
      .from('training_phases')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching training phases:', error);
      return res.status(500).json({ error: 'Failed to fetch training phases' });
    }

    console.log(`✅ [API] Found ${trainingPhases.length} training phases`);

    // Process and structure the data for the content importer
    const processedPhases = trainingPhases.map(phase => ({
      id: phase.id,
      title: phase.title || phase.name,
      name: phase.name || phase.title,
      description: phase.description,
      items: phase.items || [],
      content: phase.content,
      created_at: phase.created_at,
      updated_at: phase.updated_at
    }));

    return res.status(200).json(processedPhases);

  } catch (error) {
    console.error('❌ Error in training phases API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
