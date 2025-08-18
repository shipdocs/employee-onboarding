// Fix script for template ID 1 background image issue
const { supabase } = require('../../lib/supabase-cjs');

async function fixTemplateBackground() {
  try {
    console.log('🔧 Fixing Template ID 1 background image...\n');
    
    // Option 1: Set background image to null (remove the corrupted image)
    console.log('Option 1: Remove corrupted background image');
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('pdf_templates')
      .update({ 
        background_image: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating template:', updateError);
      return;
    }
    
    console.log('✅ Successfully removed corrupted background image');
    console.log('📋 Updated template:');
    console.log('  - ID:', updatedTemplate.id);
    console.log('  - Name:', updatedTemplate.name);
    console.log('  - Background Image:', updatedTemplate.background_image || 'null');
    console.log('  - Updated At:', updatedTemplate.updated_at);
    
    console.log('\n🎯 Next steps:');
    console.log('1. Template ID 1 now has no background image');
    console.log('2. User can upload a new background image via the PDF Template Editor');
    console.log('3. The canvas should now display without attempting to load the corrupted image');
    console.log('4. Test the editor to confirm the background image upload functionality works');
    
    // Option 2: Use one of the working background images
    console.log('\n🔄 Alternative: Would you like to use one of the working background images?');
    console.log('Available working images:');
    console.log('  - template-bg-1-59689243-5e5b-416d-9a0d-a217496c649a.png (202629 bytes)');
    console.log('  - template-bg-1-6652a11c-9736-419e-b4f6-fdfc4ff44cb2.png (202629 bytes)');
    
    // For testing, let's create a simple test URL
    const workingImageUrl = 'https://ocqnnyxnqaedarcohywe.supabase.co/storage/v1/object/public/documents/backgrounds/template-bg-1-59689243-5e5b-416d-9a0d-a217496c649a.png';
    
    console.log('\n🧪 Testing with working image URL...');
    
    const { data: testTemplate, error: testError } = await supabase
      .from('pdf_templates')
      .update({ 
        background_image: workingImageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Error setting test image:', testError);
    } else {
      console.log('✅ Set working background image for testing');
      console.log('📋 Template now uses:', testTemplate.background_image);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
  
  process.exit(0);
}

fixTemplateBackground();