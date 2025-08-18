// Maritime-specific training templates
export const MARITIME_TEMPLATES = {
  'emergency-response': {
    title: 'Emergency Response Drill',
    description: 'Comprehensive emergency procedures and response protocols',
    timeLimit: 48,
    category: 'emergency',
    items: [
      {
        id: 'emergency_01',
        number: '01',
        title: 'Emergency Alarm Recognition',
        description: 'Identifying different alarm signals and their meanings',
        category: 'emergency',
        content: {
          overview: '<p>Learn to identify and respond to various emergency alarm signals used onboard.</p>',
          objectives: [
            'Recognize general alarm signal (7 short + 1 long blast)',
            'Distinguish between fire, abandon ship, and man overboard alarms',
            'Understand alarm response procedures'
          ],
          keyPoints: [
            'General alarm: 7 short + 1 long blast repeated',
            'Fire alarm: Continuous ringing',
            'Abandon ship: 6 short + 1 long blast repeated',
            'All hands: Rapid continuous ringing'
          ],
          procedures: [
            'Stop what you are doing immediately',
            'Listen carefully to identify the alarm type',
            'Proceed to your designated muster station',
            'Report to your assigned officer',
            'Await further instructions'
          ],
          additionalContent: '<p><strong>Remember:</strong> Never ignore any alarm signal. Every alarm is treated as real until proven otherwise.</p>'
        }
      },
      {
        id: 'emergency_02',
        number: '02',
        title: 'Muster Station Procedures',
        description: 'Proper behavior and procedures at emergency muster stations',
        category: 'emergency',
        content: {
          overview: '<p>Master the procedures required at your designated muster station during emergencies.</p>',
          objectives: [
            'Locate your assigned muster station quickly',
            'Understand roll call procedures',
            'Know required emergency equipment'
          ],
          keyPoints: [
            'Your muster station is posted in your cabin',
            'Bring life jacket and any assigned emergency equipment',
            'Report immediately to designated officer',
            'Remain calm and follow instructions'
          ],
          procedures: [
            'Proceed directly to your muster station',
            'Put on life jacket correctly',
            'Report your presence to the officer',
            'Stand in designated position',
            'Wait for further instructions - do not leave without permission'
          ],
          additionalContent: '<p><strong>Equipment to bring:</strong> Life jacket, immersion suit (if required), and any emergency equipment assigned to you.</p>'
        }
      }
    ]
  },

  'safety-procedures': {
    title: 'Basic Safety Procedures',
    description: 'Essential safety protocols for maritime operations',
    timeLimit: 24,
    category: 'safety',
    items: [
      {
        id: 'safety_01',
        number: '01',
        title: 'Personal Protective Equipment (PPE)',
        description: 'Proper use and maintenance of safety equipment',
        category: 'safety',
        content: {
          overview: '<p>Learn the correct use, care, and maintenance of personal protective equipment onboard.</p>',
          objectives: [
            'Identify required PPE for different tasks',
            'Demonstrate proper PPE usage',
            'Understand PPE inspection and maintenance'
          ],
          keyPoints: [
            'Hard hat required in designated areas',
            'Safety shoes with non-slip soles mandatory',
            'Eye protection when handling chemicals',
            'Hearing protection in engine room'
          ],
          procedures: [
            'Inspect PPE before each use',
            'Report damaged equipment immediately',
            'Store PPE properly after use',
            'Replace worn or damaged items'
          ],
          additionalContent: '<p><strong>Remember:</strong> PPE is your first line of defense. Never compromise on safety equipment.</p>'
        }
      }
    ]
  },

  'navigation-basics': {
    title: 'Navigation Fundamentals',
    description: 'Basic navigation principles and procedures',
    timeLimit: 36,
    category: 'navigation',
    items: [
      {
        id: 'nav_01',
        number: '01',
        title: 'Chart Reading Basics',
        description: 'Understanding nautical charts and symbols',
        category: 'navigation',
        content: {
          overview: '<p>Master the fundamentals of reading and interpreting nautical charts.</p>',
          objectives: [
            'Read depth soundings and contour lines',
            'Identify navigational aids on charts',
            'Understand chart symbols and abbreviations'
          ],
          keyPoints: [
            'Depth soundings indicate water depth',
            'Contour lines show underwater topography',
            'Symbols indicate buoys, lights, and hazards',
            'Chart datum and projection information is crucial'
          ],
          procedures: [
            'Check chart edition and corrections',
            'Identify your position on the chart',
            'Plot course and bearing lines',
            'Mark hazards and safe water areas'
          ],
          additionalContent: '<p><strong>Chart maintenance:</strong> Always use the latest edition and apply all published corrections.</p>'
        }
      }
    ]
  },

  'cargo-handling': {
    title: 'Cargo Operations',
    description: 'Safe cargo handling and stowage procedures',
    timeLimit: 30,
    category: 'cargo',
    items: [
      {
        id: 'cargo_01',
        number: '01',
        title: 'Cargo Securing Principles',
        description: 'Methods and materials for securing cargo',
        category: 'cargo',
        content: {
          overview: '<p>Learn essential principles for safely securing cargo during transport.</p>',
          objectives: [
            'Calculate required lashing strength',
            'Select appropriate securing equipment',
            'Apply proper lashing techniques'
          ],
          keyPoints: [
            'Cargo must withstand acceleration forces',
            'Use proper lashing points and equipment',
            'Distribute loads evenly',
            'Regular inspection during voyage'
          ],
          procedures: [
            'Calculate cargo weight and center of gravity',
            'Select appropriate lashing equipment',
            'Apply lashings according to cargo plan',
            'Inspect and tighten lashings regularly'
          ],
          additionalContent: '<p><strong>Safety note:</strong> Loose cargo can cause serious injury and vessel instability.</p>'
        }
      }
    ]
  },

  'port-procedures': {
    title: 'Port Entry Procedures',
    description: 'Standard procedures for entering and leaving port',
    timeLimit: 18,
    category: 'navigation',
    items: [
      {
        id: 'port_01',
        number: '01',
        title: 'Pilot Boarding Procedures',
        description: 'Safe procedures for embarking and disembarking pilots',
        category: 'navigation',
        content: {
          overview: '<p>Master the safety procedures for pilot boarding operations.</p>',
          objectives: [
            'Prepare pilot boarding equipment properly',
            'Ensure safe pilot transfer',
            'Follow international regulations'
          ],
          keyPoints: [
            'Pilot ladder must be rigged on lee side',
            'Adequate lighting required',
            'Safety boat on standby',
            'Clear communication with pilot boat'
          ],
          procedures: [
            'Rig pilot ladder according to SOLAS requirements',
            'Post crew member to assist pilot',
            'Maintain communication with bridge',
            'Secure ladder after pilot boards'
          ],
          additionalContent: '<p><strong>Regulation:</strong> All pilot boarding arrangements must comply with SOLAS Chapter V.</p>'
        }
      }
    ]
  }
};

export const TEMPLATE_CATEGORIES = [
  { id: 'emergency', name: 'Emergency Procedures', color: '#dc3545', icon: '🚨' },
  { id: 'safety', name: 'Safety Protocols', color: '#fd7e14', icon: '⚠️' },
  { id: 'navigation', name: 'Navigation', color: '#0d6efd', icon: '🧭' },
  { id: 'cargo', name: 'Cargo Operations', color: '#198754', icon: '📦' },
  { id: 'maintenance', name: 'Maintenance', color: '#6610f2', icon: '🔧' },
  { id: 'documentation', name: 'Documentation', color: '#20c997', icon: '📋' }
];

