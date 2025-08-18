// Test script to debug background image loading issue
const { supabase } = require('./lib/supabase-cjs');

async function testBackgroundImage() {
  try {
    console.log('🔍 Investigating Template ID 1 background image issue...\n');
    
    // 1. Get template data from database
    const { data: template, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    console.log('📋 Template Info:');
    console.log('  - ID:', template.id);
    console.log('  - Name:', template.name);
    console.log('  - Background Image URL:', template.background_image);
    console.log('  - URL Length:', template.background_image?.length || 0);
    console.log('  - Created At:', template.created_at);
    console.log('  - Updated At:', template.updated_at);
    console.log('');
    
    // 2. Test the URL accessibility
    if (template.background_image) {
      console.log('🌐 Testing URL accessibility...');
      
      try {
        const fetch = require('node-fetch');
        const response = await fetch(template.background_image);
        
        console.log('  - Status:', response.status);
        console.log('  - Status Text:', response.statusText);
        console.log('  - Content-Type:', response.headers.get('content-type'));
        console.log('  - Content-Length:', response.headers.get('content-length'));
        console.log('  - CORS Headers:');
        console.log('    - Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
        console.log('    - Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods'));
        
        if (response.ok) {
          const buffer = await response.buffer();
          console.log('  - Actual Image Size:', buffer.length, 'bytes');
          
          if (buffer.length < 1000) {
            console.log('⚠️  WARNING: Image size is very small, might be empty or corrupted');
            console.log('  - First 50 bytes as hex:', buffer.slice(0, 50).toString('hex'));
            console.log('  - First 50 bytes as text:', buffer.slice(0, 50).toString('utf8'));
          } else {
            console.log('✅ Image appears to be valid');
          }
        } else {
          console.log('❌ URL is not accessible');
        }
      } catch (fetchError) {
        console.error('❌ Error fetching URL:', fetchError.message);
      }
    } else {
      console.log('❌ No background image URL found');
    }
    
    console.log('\n🔧 Debugging suggestions:');
    console.log('1. Check if the background image URL loads in the browser');
    console.log('2. Verify the image is actually displayed in the CSS background-image');
    console.log('3. Check browser dev tools for network errors or CORS issues');
    console.log('4. Ensure the CSS background-size, background-repeat, and background-position are correct');
    console.log('5. Test with a different, known-good image URL');
    
    // 3. Test the Supabase storage bucket directly
    console.log('\n🗄️  Testing Supabase Storage Bucket...');
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Error listing buckets:', bucketError);
      } else {
        console.log('📁 Available buckets:', buckets.map(b => b.name));
        
        const documentsBucket = buckets.find(b => b.name === 'documents');
        if (documentsBucket) {
          console.log('✅ Documents bucket exists');
          
          // List files in backgrounds folder
          const { data: files, error: filesError } = await supabase.storage
            .from('documents')
            .list('backgrounds');
          
          if (filesError) {
            console.error('❌ Error listing background files:', filesError);
          } else {
            console.log('📄 Background files:', files.length);
            files.forEach(file => {
              console.log(`  - ${file.name} (${file.metadata?.size || 'unknown size'})`);
            });
          }
        } else {
          console.log('❌ Documents bucket not found');
        }
      }
    } catch (storageError) {
      console.error('❌ Storage test error:', storageError);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
  
  process.exit(0);
}

// Install node-fetch if not available
try {
  require('node-fetch');
} catch (e) {
  console.log('📦 Installing node-fetch...');
  require('child_process').execSync('npm install node-fetch@2', { stdio: 'inherit' });
}

testBackgroundImage();