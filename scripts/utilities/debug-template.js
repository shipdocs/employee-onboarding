// Debug script to check template configuration
require('dotenv').config();
const { supabase } = require('../lib/database-supabase-compat');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugTemplate() {
  console.log('🔍 Debugging Form 05_03a template...\n');
  
  try {
    // Get template
    const { data: templates, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .ilike('name', '%05_03a%');
      
    if (error) {
      console.error('❌ Error fetching template:', error);
      return;
    }
    
    if (!templates || templates.length === 0) {
      console.log('❌ No Form 05_03a template found');
      return;
    }
    
    const template = templates[0];
    console.log('✅ Template found:');
    console.log('📝 Name:', template.name);
    console.log('📄 Page size:', template.page_size);
    console.log('🔄 Orientation:', template.orientation);
    console.log('🖼️  Background image:', template.background_image || 'None');
    
    const fields = JSON.parse(template.fields || '[]');
    console.log('🔢 Fields count:', fields.length);
    
    if (fields.length > 0) {
      console.log('\n📋 Template Fields:');
      fields.forEach((field, index) => {
        console.log(`\n  Field ${index + 1}:`);
        console.log(`    ID: ${field.id}`);
        console.log(`    Type: ${field.type}`);
        console.log(`    Position: (${field.x}, ${field.y})`);
        console.log(`    Size: ${field.width}x${field.height}`);
        console.log(`    Data Binding: ${field.dataBinding || 'None'}`);
        console.log(`    Properties:`, field.properties || {});
      });
    } else {
      console.log('⚠️  No fields configured in template');
    }
    
    // Test sample data mapping
    console.log('\n🧪 Testing data mapping:');
    const sampleData = {
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      position: 'Deck Officer',
      vesselAssignment: 'MV Test Ship',
      completionDate: '2024-01-15'
    };
    
    console.log('Sample data:', sampleData);
    
    fields.forEach(field => {
      if (field.dataBinding && sampleData[field.dataBinding]) {
        console.log(`✅ Field "${field.id}" would show: "${sampleData[field.dataBinding]}"`);
      } else if (field.dataBinding) {
        console.log(`⚠️  Field "${field.id}" has binding "${field.dataBinding}" but no matching data`);
      } else {
        console.log(`ℹ️  Field "${field.id}" has no data binding (static content)`);
      }
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugTemplate();
