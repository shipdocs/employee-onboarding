// Check DNS records for burando.online
const dns = require('dns').promises;

async function checkDNS() {
  console.log('🔍 Checking DNS records for burando.online');
  console.log('===========================================');
  
  try {
    // Check TXT records (includes SPF and DMARC)
    console.log('\n📋 TXT Records:');
    const txtRecords = await dns.resolveTxt('burando.online');
    txtRecords.forEach((record, index) => {
      const recordText = record.join('');
      console.log(`${index + 1}. ${recordText}`);
      
      if (recordText.includes('v=spf1')) {
        console.log('   ↳ 📧 SPF Record detected');
      }
      if (recordText.includes('v=DMARC1')) {
        console.log('   ↳ 🔒 DMARC Record detected');
      }
    });
    
    // Check DMARC specifically
    console.log('\n🔒 DMARC Records (_dmarc.burando.online):');
    try {
      const dmarcRecords = await dns.resolveTxt('_dmarc.burando.online');
      dmarcRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.join('')}`);
      });
    } catch (error) {
      console.log('❌ No DMARC records found or error:', error.message);
    }

    // Check DKIM records (common selectors)
    console.log('\n🔑 DKIM Records:');
    const dkimSelectors = ['default', 'protonmail', 'protonmail2', 'protonmail3', 'selector1', 'selector2'];

    for (const selector of dkimSelectors) {
      try {
        const dkimDomain = `${selector}._domainkey.burando.online`;
        const dkimRecords = await dns.resolveTxt(dkimDomain);
        console.log(`✅ ${selector}: Found DKIM record`);
        dkimRecords.forEach((record, index) => {
          const recordText = record.join('');
          console.log(`   ${index + 1}. ${recordText.substring(0, 100)}${recordText.length > 100 ? '...' : ''}`);
        });
      } catch (error) {
        console.log(`❌ ${selector}: No DKIM record found`);
      }
    }
    
    // Check MX records
    console.log('\n📬 MX Records:');
    const mxRecords = await dns.resolveMx('burando.online');
    mxRecords.forEach((record, index) => {
      console.log(`${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    // Analysis
    console.log('\n🔍 Analysis:');
    const spfRecords = txtRecords.filter(record => record.join('').includes('v=spf1'));
    const dmarcRecords = txtRecords.filter(record => record.join('').includes('v=DMARC1'));
    
    console.log(`📧 SPF Records found: ${spfRecords.length}`);
    if (spfRecords.length > 1) {
      console.log('⚠️  WARNING: Multiple SPF records detected! This can cause authentication failures.');
    } else if (spfRecords.length === 1) {
      console.log('✅ Single SPF record - Good!');
    } else {
      console.log('❌ No SPF record found');
    }
    
    console.log(`🔒 DMARC Records found: ${dmarcRecords.length}`);
    if (dmarcRecords.length > 1) {
      console.log('⚠️  WARNING: Multiple DMARC records detected! This can cause policy conflicts.');
    } else if (dmarcRecords.length === 1) {
      console.log('✅ Single DMARC record - Good!');
    } else {
      console.log('❌ No DMARC record found in main domain');
    }
    
  } catch (error) {
    console.error('❌ Error checking DNS:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkDNS().catch(console.error);
}

module.exports = { checkDNS };
