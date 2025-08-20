// Training data extracted from appendix05_03a-Introduction personnel.pdf and Safety Management System
const trainingData = {
  phases: {
    1: {
      title: "Immediate Safety Training",
      description: "Essential safety training to be completed within 24 hours of boarding",
      timeLimit: 24, // hours
      items: [
        {
          number: "01",
          title: "Meet colleagues + daily affairs on board",
          description: "Introduction to crew members and daily routines",
          category: "orientation",
          content: {
            overview: "Welcome aboard! This module introduces you to your new colleagues and the daily operations of the vessel.",
            objectives: [
              "Meet all crew members and understand their roles",
              "Learn the daily routine and watch schedules",
              "Understand communication protocols",
              "Familiarize with living quarters and common areas"
            ],
            keyPoints: [
              "The Master has ultimate responsibility for vessel safety and operations",
              "Clear communication is essential for safe operations",
              "Respect for all crew members regardless of rank or nationality",
              "Punctuality is critical for watch changes and safety drills"
            ],
            procedures: [
              "Report to the Master upon boarding",
              "Complete crew list and emergency contact information",
              "Receive cabin assignment and vessel orientation",
              "Review watch schedule and duty assignments"
            ]
          }
        },
        {
          number: "02",
          title: "Emergency response system Red Book",
          description: "Familiarization with emergency procedures and Red Book protocols",
          category: "emergency",
          content: {
            overview: "The Red Book contains critical emergency response procedures that every crew member must know. This system ensures coordinated response to all emergency situations.",
            objectives: [
              "Understand the Red Book emergency response system",
              "Know your specific emergency duties and muster station",
              "Learn emergency communication procedures",
              "Practice emergency response protocols"
            ],
            keyPoints: [
              "The Red Book is the primary emergency response manual",
              "All crew must know their emergency station and duties",
              "Emergency signals must be recognized immediately",
              "Regular drills ensure preparedness and competency"
            ],
            procedures: [
              "Locate and review the Red Book in your cabin",
              "Memorize your muster station and emergency duties",
              "Learn the location of emergency equipment",
              "Participate in all emergency drills"
            ],
            emergencyTypes: [
              "Fire emergency - immediate response required",
              "Man overboard - search and rescue procedures",
              "Collision or grounding - damage control",
              "Medical emergency - first aid and evacuation",
              "Pollution incident - containment and reporting"
            ]
          }
        },
        {
          number: "03",
          title: "Smoke and fire prohibition",
          description: "Understanding of smoking restrictions and fire prevention measures",
          category: "safety",
          content: {
            overview: "Fire prevention is critical aboard vessels. Understanding smoking restrictions and fire prevention measures protects crew, cargo, and the environment.",
            objectives: [
              "Understand designated smoking areas and restrictions",
              "Learn fire prevention best practices",
              "Know the consequences of fire safety violations",
              "Understand hot work permit procedures"
            ],
            keyPoints: [
              "Smoking is only permitted in designated areas",
              "No smoking near fuel, cargo, or hazardous materials",
              "Proper disposal of cigarette butts is mandatory",
              "Hot work requires permits and fire watch procedures"
            ],
            procedures: [
              "Use only designated smoking areas",
              "Ensure cigarettes are completely extinguished",
              "Dispose of butts in proper receptacles",
              "Report any fire hazards immediately"
            ]
          }
        },
        {
          number: "04",
          title: "Written instructions",
          description: "Review of written safety and operational instructions",
          category: "documentation",
          content: {
            overview: "Written safety and operational instructions provide essential guidance for safe vessel operations. All crew must be familiar with these documents.",
            objectives: [
              "Locate and understand key safety documents",
              "Know how to access operational procedures",
              "Understand the importance of following written instructions",
              "Learn document update and revision procedures"
            ],
            keyPoints: [
              "Safety Management System is the primary reference",
              "All procedures must be followed as written",
              "Updates and revisions must be communicated to all crew",
              "Documentation is required for compliance and audits"
            ],
            procedures: [
              "Review all relevant safety documents upon boarding",
              "Ensure you have access to current versions",
              "Report any unclear or outdated instructions",
              "Follow document control procedures for updates"
            ]
          }
        },
        {
          number: "05",
          title: "Personal Protection Equipment",
          description: "Proper use and maintenance of PPE",
          category: "safety",
          content: {
            overview: "Personal Protective Equipment (PPE) is your first line of defense against workplace hazards. Proper selection, use, and maintenance of PPE is essential for safety.",
            objectives: [
              "Identify required PPE for different tasks",
              "Learn proper donning and doffing procedures",
              "Understand PPE inspection and maintenance",
              "Know when to replace damaged equipment"
            ],
            keyPoints: [
              "PPE must be worn when required - no exceptions",
              "Inspect PPE before each use",
              "Report damaged or defective equipment immediately",
              "Proper storage extends PPE life and effectiveness"
            ],
            procedures: [
              "Inspect PPE before each use",
              "Follow manufacturer's instructions for use",
              "Clean and store PPE properly after use",
              "Replace damaged or expired equipment immediately"
            ],
            ppeTypes: [
              "Hard hats - protect against falling objects",
              "Safety glasses - eye protection from debris",
              "Work gloves - hand protection from cuts and chemicals",
              "Safety shoes - foot protection and slip resistance",
              "High-visibility clothing - visibility in work areas",
              "Hearing protection - protection from noise exposure"
            ]
          }
        },
        {
          number: "06",
          title: "Fire extinguishing equipment",
          description: "Location and operation of fire extinguishing systems",
          category: "emergency",
          content: {
            overview: "Fire extinguishing equipment is critical for vessel safety. All crew must know the location and proper operation of fire suppression systems.",
            objectives: [
              "Locate all fire extinguishing equipment on board",
              "Understand different types of fire extinguishers",
              "Learn proper operation procedures",
              "Know maintenance and inspection requirements"
            ],
            keyPoints: [
              "Different fires require different extinguishing agents",
              "Quick response is critical in fire emergencies",
              "Regular inspection ensures equipment readiness",
              "Training and practice improve emergency response"
            ],
            procedures: [
              "Locate nearest fire extinguisher to your work area",
              "Check pressure gauge and inspection tags",
              "Learn PASS technique: Pull, Aim, Squeeze, Sweep",
              "Report any defective equipment immediately"
            ],
            extinguisherTypes: [
              "Class A - Ordinary combustibles (wood, paper, fabric)",
              "Class B - Flammable liquids (oil, gasoline, paint)",
              "Class C - Electrical fires (motors, switches, wiring)",
              "Class D - Combustible metals (magnesium, titanium)",
              "Class K - Cooking oils and fats (galley fires)"
            ]
          }
        },
        {
          number: "07",
          title: "Fire extinguishing system engine rooms",
          description: "Specific fire suppression systems in engine compartments",
          category: "emergency",
          content: {
            overview: "Engine rooms require specialized fire suppression systems due to high fire risk from fuel, oil, and electrical equipment. Understanding these systems is critical for crew safety.",
            objectives: [
              "Locate engine room fire suppression systems",
              "Understand automatic and manual activation procedures",
              "Know evacuation procedures before system activation",
              "Learn post-activation safety procedures"
            ],
            keyPoints: [
              "Engine room fires spread rapidly due to fuel and oil",
              "CO2 systems displace oxygen - immediate evacuation required",
              "Manual activation requires confirmation of personnel evacuation",
              "Never enter engine room after CO2 discharge without proper equipment"
            ],
            procedures: [
              "Sound alarm and evacuate all personnel from engine room",
              "Shut down ventilation and close fire dampers",
              "Activate fire suppression system from safe location",
              "Monitor from outside until all-clear is given"
            ]
          }
        },
        {
          number: "08",
          title: "Emergency shutoff valves bunker tanks",
          description: "Location and operation of emergency fuel shutoff valves",
          category: "emergency",
          content: {
            overview: "Emergency shutoff valves for bunker tanks are critical safety devices that can prevent fuel spills and fire spread during emergencies.",
            objectives: [
              "Locate all emergency shutoff valves for bunker tanks",
              "Understand when and how to operate these valves",
              "Know the consequences of valve activation",
              "Learn coordination procedures with engine room"
            ],
            keyPoints: [
              "Emergency shutoff valves stop fuel flow immediately",
              "Activation will shut down engines - coordinate with bridge",
              "Valves should only be operated in genuine emergencies",
              "Know location of manual override controls"
            ],
            procedures: [
              "Assess emergency situation and confirm need for shutoff",
              "Notify bridge and engine room before activation",
              "Operate valve according to posted procedures",
              "Confirm valve closure and report status"
            ]
          }
        },
        {
          number: "09",
          title: "Respiratory filter + knowledge of use + escape masks",
          description: "Proper use of breathing apparatus and escape equipment",
          category: "safety",
          content: {
            overview: "Respiratory protection equipment is essential for survival in toxic atmospheres, smoke, or oxygen-deficient environments.",
            objectives: [
              "Identify different types of respiratory protection",
              "Learn proper donning and use procedures",
              "Understand limitations and operating time",
              "Know maintenance and storage requirements"
            ],
            keyPoints: [
              "Different hazards require different respiratory protection",
              "Escape masks provide limited time for evacuation only",
              "Proper seal is critical for effectiveness",
              "Regular inspection and maintenance required"
            ],
            procedures: [
              "Select appropriate respiratory protection for hazard",
              "Inspect equipment before use",
              "Don equipment following proper sequence",
              "Monitor operating time and exit before depletion"
            ]
          }
        },
        {
          number: "10",
          title: "Emergency eye wash station / bottle",
          description: "Location and use of emergency eye wash facilities",
          category: "safety",
          content: {
            overview: "Emergency eye wash facilities provide immediate decontamination for eyes exposed to chemicals, debris, or other hazardous materials.",
            objectives: [
              "Locate all emergency eye wash stations on vessel",
              "Learn proper eye wash procedures",
              "Understand when to use eye wash vs. seek medical attention",
              "Know maintenance and testing requirements"
            ],
            keyPoints: [
              "Immediate flushing is critical - within 10 seconds",
              "Flush for minimum 15 minutes with clean water",
              "Remove contact lenses if possible during flushing",
              "Seek medical attention after initial treatment"
            ],
            procedures: [
              "Immediately move to nearest eye wash station",
              "Activate eye wash and flush both eyes",
              "Hold eyelids open and move eyes to ensure thorough flushing",
              "Continue flushing while seeking medical assistance"
            ]
          }
        },
        {
          number: "11",
          title: "Lifebuoys",
          description: "Location and deployment of life-saving equipment",
          category: "safety",
          content: {
            overview: "Lifebuoys are essential life-saving devices strategically placed around the vessel for immediate deployment in man overboard situations.",
            objectives: [
              "Locate all lifebuoys on the vessel",
              "Learn proper deployment techniques",
              "Understand when and how to use lifebuoys",
              "Know maintenance and inspection requirements"
            ],
            keyPoints: [
              "Lifebuoys must be immediately accessible at all times",
              "Quick deployment is critical in man overboard situations",
              "Some lifebuoys are equipped with lights and smoke signals",
              "Regular inspection ensures equipment readiness"
            ],
            procedures: [
              "Identify nearest lifebuoy to your work area",
              "In emergency, grab lifebuoy and throw toward person in water",
              "Aim slightly ahead of person to account for vessel movement",
              "Immediately alert bridge and maintain visual contact"
            ]
          }
        },
        {
          number: "12",
          title: "Lifejackets",
          description: "Proper fitting and use of personal flotation devices",
          category: "safety",
          content: {
            overview: "Lifejackets are personal flotation devices that must be properly fitted and readily available to all crew members for emergency situations.",
            objectives: [
              "Learn proper lifejacket fitting and adjustment",
              "Understand different types of lifejackets on board",
              "Know when lifejackets must be worn",
              "Learn inspection and maintenance procedures"
            ],
            keyPoints: [
              "Proper fit is essential for lifejacket effectiveness",
              "Lifejackets must be worn during emergency drills",
              "Some lifejackets have automatic inflation systems",
              "Regular inspection prevents equipment failure"
            ],
            procedures: [
              "Select appropriate size lifejacket",
              "Put on lifejacket and secure all straps and buckles",
              "Adjust for snug but comfortable fit",
              "Test inflation system if applicable"
            ]
          }
        },
        {
          number: "13",
          title: "Lifeboat",
          description: "Lifeboat operation and emergency procedures",
          category: "emergency",
          content: {
            overview: "Lifeboats are the primary means of evacuation in emergency situations. All crew must be familiar with lifeboat operation and emergency procedures.",
            objectives: [
              "Locate lifeboat stations and equipment",
              "Learn lifeboat launching procedures",
              "Understand crew assignments and responsibilities",
              "Know survival procedures once in lifeboat"
            ],
            keyPoints: [
              "Lifeboats must be ready for immediate deployment",
              "Each crew member has assigned lifeboat station",
              "Launching requires coordination and proper sequence",
              "Survival equipment must be checked regularly"
            ],
            procedures: [
              "Report to assigned lifeboat station when alarm sounds",
              "Don lifejacket and assist others as needed",
              "Follow launching sequence under officer supervision",
              "Maintain order and follow survival procedures"
            ]
          }
        },
        {
          number: "14",
          title: "Company regulations (Appendix 07-01)",
          description: "Understanding of company policies and regulations",
          category: "policy",
          content: {
            overview: "Company regulations establish the framework for safe and efficient vessel operations. All crew must understand and comply with these regulations.",
            objectives: [
              "Understand key company regulations and policies",
              "Learn reporting procedures and chain of command",
              "Know disciplinary procedures and consequences",
              "Understand rights and responsibilities as crew member"
            ],
            keyPoints: [
              "Company regulations are mandatory for all crew",
              "Violations can result in disciplinary action",
              "Regulations are designed to ensure safety and efficiency",
              "Regular updates may be issued - stay informed"
            ],
            procedures: [
              "Read and understand all applicable regulations",
              "Ask questions if any regulation is unclear",
              "Report violations or concerns to appropriate officer",
              "Maintain professional conduct at all times"
            ]
          }
        },
        {
          number: "15",
          title: "Policy Social Media",
          description: "Social media usage guidelines and restrictions",
          category: "policy",
          content: {
            overview: "Social media policy ensures professional conduct and protects company reputation while respecting crew members' personal expression rights.",
            objectives: [
              "Understand acceptable social media usage while on duty",
              "Learn what content is prohibited or restricted",
              "Know consequences of policy violations",
              "Understand privacy and confidentiality requirements"
            ],
            keyPoints: [
              "No posting of company confidential information",
              "No negative comments about company or colleagues",
              "No posting of vessel locations or cargo information",
              "Personal opinions must be clearly identified as such"
            ],
            procedures: [
              "Review social media policy thoroughly",
              "Think before posting - consider company impact",
              "Report inappropriate posts by others",
              "Seek guidance if unsure about content appropriateness"
            ]
          }
        },
        {
          number: "16",
          title: "Alcohol and drugs policy",
          description: "Zero tolerance policy for substance abuse",
          category: "policy",
          content: {
            overview: "Maritime Onboarding Services maintains a strict zero tolerance policy for alcohol and drugs to ensure the safety of crew, vessel, and environment.",
            objectives: [
              "Understand the zero tolerance policy completely",
              "Know testing procedures and consequences",
              "Learn about support resources for substance abuse",
              "Understand legal and safety implications"
            ],
            keyPoints: [
              "Zero tolerance means no alcohol or drugs permitted",
              "Random testing may be conducted at any time",
              "Violations result in immediate dismissal",
              "Policy applies 24/7 while on vessel or on duty"
            ],
            procedures: [
              "Maintain complete sobriety while on vessel",
              "Report suspected violations immediately",
              "Cooperate fully with any testing procedures",
              "Seek help if struggling with substance abuse"
            ]
          }
        },
        {
          number: "17",
          title: "General alarm",
          description: "Recognition and response to general alarm signals",
          category: "emergency",
          content: {
            overview: "The general alarm is the most important signal on the vessel, indicating an emergency requiring immediate crew response and potential evacuation.",
            objectives: [
              "Recognize general alarm signal immediately",
              "Know your assigned muster station and route",
              "Understand emergency response procedures",
              "Learn coordination with other crew members"
            ],
            keyPoints: [
              "General alarm requires immediate response - drop everything",
              "Seven short blasts followed by one long blast",
              "Report to muster station immediately",
              "Await further instructions from officers"
            ],
            procedures: [
              "Stop current activity immediately when alarm sounds",
              "Proceed to assigned muster station via designated route",
              "Report to station leader and await instructions",
              "Remain calm and assist others as needed"
            ]
          }
        },
        {
          number: "18",
          title: "Reporting incidents, near miss and deviations to the captain",
          description: "Proper incident reporting procedures and chain of command",
          category: "safety",
          content: {
            overview: "Proper incident reporting is essential for safety improvement and regulatory compliance. All incidents, near misses, and deviations must be reported immediately.",
            objectives: [
              "Understand what constitutes reportable incidents",
              "Learn proper reporting procedures and timelines",
              "Know the chain of command for reporting",
              "Understand the importance of accurate reporting"
            ],
            keyPoints: [
              "Report ALL incidents, near misses, and deviations",
              "Immediate reporting to captain is required",
              "Accurate and complete information is essential",
              "No blame culture - focus on prevention and learning"
            ],
            procedures: [
              "Secure the scene and ensure immediate safety",
              "Report to captain immediately - verbal first",
              "Complete written report as soon as possible",
              "Cooperate fully with any investigation"
            ]
          }
        }
      ]
    },
    2: {
      title: "Operational Training",
      description: "Operational and cargo handling training to be completed within 72 hours",
      timeLimit: 72, // hours
      items: [
        {
          number: "01",
          title: "Steering direction bow thruster",
          description: "Operation and control of bow thruster systems",
          category: "navigation",
          content: {
            overview: "Bow thrusters provide lateral thrust for improved maneuverability during docking and close-quarters navigation. Proper operation is essential for safe vessel handling.",
            objectives: [
              "Understand bow thruster operation principles",
              "Learn proper startup and shutdown procedures",
              "Master directional controls and thrust management",
              "Know safety precautions and limitations"
            ],
            keyPoints: [
              "Always check surrounding area before operation",
              "Verify steering direction before engaging",
              "Monitor for debris or obstructions",
              "Understand power limitations and operating conditions"
            ],
            procedures: [
              "Perform pre-operation safety check",
              "Verify control direction and response",
              "Start thruster according to manufacturer procedures",
              "Monitor operation and shut down properly"
            ]
          }
        },
        {
          number: "02",
          title: "Emergency lowering wheelhouse",
          description: "Emergency procedures for wheelhouse lowering systems",
          category: "emergency"
        },
        {
          number: "03",
          title: "Clearance known",
          description: "Understanding of vessel clearance requirements",
          category: "navigation"
        },
        {
          number: "04",
          title: "Emergency power supply",
          description: "Emergency power systems and backup procedures",
          category: "emergency"
        },
        {
          number: "05",
          title: "Operation blue board",
          description: "Blue board signaling system operation",
          category: "navigation"
        },
        {
          number: "06",
          title: "Operation radar",
          description: "Radar system operation and interpretation",
          category: "navigation"
        },
        {
          number: "07",
          title: "Use of emergency steering mechanism",
          description: "Emergency steering procedures and backup systems",
          category: "emergency"
        },
        {
          number: "08",
          title: "Switching between emergency and main steering mechanism",
          description: "Transition procedures between steering systems",
          category: "navigation"
        },
        {
          number: "09",
          title: "Stability program",
          description: "Vessel stability calculations and monitoring",
          category: "navigation"
        },
        {
          number: "10",
          title: "PMS (if applicable)",
          description: "Planned Maintenance System operation",
          category: "maintenance"
        },
        {
          number: "11",
          title: "Other nautical equipment",
          description: "Additional navigation and safety equipment",
          category: "navigation"
        },
        {
          number: "12",
          title: "Emergency response system Red Book",
          description: "Advanced emergency response procedures",
          category: "emergency"
        },
        {
          number: "13",
          title: "Familiarity with ECDIS",
          description: "Electronic Chart Display and Information System",
          category: "navigation"
        },
        {
          number: "14",
          title: "Track Pilot (if available)",
          description: "Automated navigation system operation",
          category: "navigation"
        },
        {
          number: "15",
          title: "Use track pilot (if available)",
          description: "Advanced track pilot operations and limitations",
          category: "navigation"
        },
        {
          number: "16",
          title: "Bridge detection system",
          description: "Bridge height detection and warning systems",
          category: "navigation"
        },
        {
          number: "19",
          title: "Loading operation",
          description: "Cargo loading procedures and safety protocols",
          category: "cargo"
        },
        {
          number: "20",
          title: "Unloading operation / unloading pumps",
          description: "Cargo discharge procedures and pump operations",
          category: "cargo"
        },
        {
          number: "21",
          title: "Cargo tank shutoff valves",
          description: "Cargo tank valve operations and emergency procedures",
          category: "cargo"
        },
        {
          number: "22",
          title: "Cargo tank instruments",
          description: "Tank monitoring and instrumentation systems",
          category: "cargo"
        },
        {
          number: "23",
          title: "Overpressure and negative pressure valves",
          description: "Pressure relief and vacuum protection systems",
          category: "cargo"
        },
        {
          number: "24",
          title: "Tank alarm",
          description: "Tank alarm systems and response procedures",
          category: "cargo"
        },
        {
          number: "25",
          title: "Overfill protection",
          description: "Overfill prevention systems and procedures",
          category: "cargo"
        },
        {
          number: "26",
          title: "Emergency stop unloading pumps",
          description: "Emergency shutdown procedures for cargo pumps",
          category: "cargo"
        },
        {
          number: "27",
          title: "Loading and unloading hoses",
          description: "Hose handling and connection procedures",
          category: "cargo"
        },
        {
          number: "28",
          title: "Anchor winches",
          description: "Anchor windlass operation and maintenance",
          category: "deck"
        },
        {
          number: "29",
          title: "Mooring (equipment)",
          description: "Mooring equipment and procedures",
          category: "deck"
        },
        {
          number: "30",
          title: "Sampling system",
          description: "Cargo sampling procedures and equipment",
          category: "cargo"
        },
        {
          number: "31",
          title: "Use of bunker boom",
          description: "Bunker boom operation and safety limits",
          category: "cargo"
        },
        {
          number: "32",
          title: "Crane maintenance",
          description: "Crane inspection and maintenance procedures",
          category: "maintenance"
        },
        {
          number: "33",
          title: "Deck sprinkler system",
          description: "Deck fire suppression system operation",
          category: "safety"
        },
        {
          number: "34",
          title: "Confined spaces",
          description: "Confined space entry procedures and safety",
          category: "safety"
        },
        {
          number: "35",
          title: "Hoisting work and application of choker/belt",
          description: "Lifting operations and rigging procedures",
          category: "deck"
        },
        {
          number: "36",
          title: "Explosion protection measures",
          description: "Intrinsically safe equipment and explosion prevention",
          category: "safety"
        }
      ]
    },
    3: {
      title: "Advanced Training & Policies",
      description: "Company policies and advanced procedures to be completed within one week",
      timeLimit: 168, // hours (1 week)
      items: [
        {
          number: "37",
          title: "Mission and vision 0 (Zero) Spills en 0 (Zero) incidents",
          description: "Company mission for zero incidents and environmental protection",
          category: "policy"
        },
        {
          number: "38",
          title: "Core values",
          description: "Understanding of company core values and principles",
          category: "policy"
        },
        {
          number: "39",
          title: "Policy statement",
          description: "Company policy statement and commitments",
          category: "policy"
        },
        {
          number: "40",
          title: "Security plan",
          description: "Vessel security procedures and protocols",
          category: "security"
        },
        {
          number: "41",
          title: "Work permits",
          description: "Work permit system and authorization procedures",
          category: "safety"
        },
        {
          number: "42",
          title: "Gas + oxygen + toximeter",
          description: "Gas detection equipment and monitoring procedures",
          category: "safety"
        },
        {
          number: "43",
          title: "Safety Management System",
          description: "Complete SMS understanding and implementation",
          category: "management"
        },
        {
          number: "44",
          title: "Risk Inventory & Evaluation",
          description: "Risk assessment procedures and hazard identification",
          category: "safety"
        }
      ]
    }
  },

  // Quiz questions for each phase - Based on Safety Management System
  quizzes: {
    1: [
      {
        question: "What is the first action you should take when the general alarm sounds?",
        options: [
          "Continue with current work",
          "Report to muster station immediately",
          "Call the captain",
          "Check the Red Book"
        ],
        correct: 1,
        explanation: "When the general alarm sounds, all crew must report to their designated muster station immediately as per emergency procedures."
      },
      {
        question: "Where should incidents and near misses be reported?",
        options: [
          "To any crew member",
          "To the captain only",
          "To shore management",
          "No reporting required for near misses"
        ],
        correct: 1,
        explanation: "All incidents, near misses, and deviations must be reported to the captain immediately to ensure proper investigation and prevention measures."
      },
      {
        question: "What is the company's policy on alcohol and drugs?",
        options: [
          "Moderate consumption allowed",
          "Only during off-duty hours",
          "Zero tolerance policy",
          "Captain's discretion"
        ],
        correct: 2,
        explanation: "Maritime Onboarding Services maintains a strict zero tolerance policy for alcohol and drugs to ensure safety of crew and vessel."
      },
      {
        question: "According to the Safety Management System, who has ultimate responsibility for vessel safety?",
        options: [
          "The Chief Engineer",
          "The Master/Captain",
          "Shore management",
          "All crew members equally"
        ],
        correct: 1,
        explanation: "The Master has ultimate responsibility for vessel safety and operations, as defined in the Safety Management System."
      },
      {
        question: "What should you do if you discover a safety hazard on board?",
        options: [
          "Ignore it if it's not in your department",
          "Report it immediately and take immediate action if safe to do so",
          "Wait until the next safety meeting",
          "Only report it if someone gets injured"
        ],
        correct: 1,
        explanation: "Safety hazards must be reported immediately and addressed promptly to prevent incidents. Every crew member has a responsibility for safety."
      },
      {
        question: "How often should emergency drills be conducted according to regulations?",
        options: [
          "Once per month",
          "Once per week",
          "Only when new crew joins",
          "At the captain's discretion"
        ],
        correct: 1,
        explanation: "Emergency drills must be conducted regularly (typically monthly) to ensure crew competency and readiness."
      }
    ],
    2: [
      {
        question: "What should you check before operating the bow thruster?",
        options: [
          "Engine temperature only",
          "Steering direction and surrounding area",
          "Only the control panel",
          "Nothing specific required"
        ],
        correct: 1,
        explanation: "Always verify steering direction and ensure the surrounding area is clear before operating the bow thruster."
      },
      {
        question: "What is the primary purpose of overfill protection systems?",
        options: [
          "To increase loading speed",
          "To prevent tank overflow during cargo operations",
          "To monitor cargo quality",
          "To reduce pump pressure"
        ],
        correct: 1,
        explanation: "Overfill protection systems prevent dangerous tank overflow during cargo loading operations."
      }
    ],
    3: [
      {
        question: "What does the company's 'Zero Spills, Zero Incidents' mission mean?",
        options: [
          "Accidents are acceptable if minor",
          "Complete prevention of all spills and incidents",
          "Only major incidents should be prevented",
          "Spills are acceptable if properly cleaned"
        ],
        correct: 1,
        explanation: "The company is committed to complete prevention of all spills and incidents, regardless of size."
      },
      {
        question: "When is a work permit required?",
        options: [
          "Only for hot work",
          "For all maintenance activities",
          "For any work that poses potential risks",
          "Never required on vessels"
        ],
        correct: 2,
        explanation: "Work permits are required for any work activity that poses potential safety or environmental risks."
      }
    ]
  },

  // Certificate types that can be tracked for European Inland Waterways
  certificateTypes: [
    "Rijnpatent (Rhine Patent)",
    "Binnenvaartbewijs (Inland Waterway Certificate)",
    "Radarpatent (Radar Patent)",
    "ADN Basis (Dangerous Goods Basic)",
    "ADN Droge Lading (ADN Dry Cargo)",
    "ADN Tank (ADN Tank)",
    "VHF Marifoon Certificaat",
    "Eerste Hulp (First Aid)",
    "Brandbestrijding (Fire Fighting)",
    "Medische Keuring (Medical Certificate)",
    "LPG Certificaat",
    "Kraan Certificaat (Crane Certificate)"
  ]
};

module.exports = trainingData;
