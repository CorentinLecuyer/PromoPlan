const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 🔑 Your Supabase project credentials
const supabaseUrl = 'https://wbvfmgyaudfkhridkhep.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidmZtZ3lhdWRma2hyaWRraGVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjM0ODQsImV4cCI6MjA2NTkzOTQ4NH0.ycacnokvGqBRAKCBAOaWJMjafiFGB3KuAp3gQYGJLrc';
const supabase = createClient(supabaseUrl, supabaseKey);

// 📦 Load your JSON data from file
const jsonData = JSON.parse(fs.readFileSync('C:\\Users\\LECUYECO\\Anheuser-Busch InBev\\PERFECTDRAFT BU BNFL - Documents\\4. OMNICHANNEL\\SQL\\PromoPlan\\promo-timeline-app\\src\\db\\timeline-items.json', 'utf8'));


// 🧹 Optional: clean ROI (some values are 'TBC' or 'undefined')
const cleanROI = (roi) => {
  const n = parseFloat(roi);
  return isNaN(n) ? null : n;
};

// 🚀 Push data to Supabase
async function importData() {
  for (const item of jsonData) {
    const { error } = await supabase
      .from('promotions')
      .insert([{
        id: item.id,
        promo_title: item.promo_title,
        promo_type: item.promo_type,
        channel_tags: item.channel_tags,
        icon: item.icon,
        link: item.link,
        month: item.month,
        year: item.year,
        promo_budget: item.promo_budget,
        promo_budget_type: item.promo_budget_type,
        promo_details: item.promo_details,
        promo_start_date: item.promo_start_date,
        promo_end_date: item.promo_end_date,
        promo_uplift_HL: item.promo_uplift_HL,
        promo_uplift_machine: item.promo_uplift_machine,
        ROI: cleanROI(item.ROI),
        table: Array.isArray(item.table) ? item.table : [item.table]
      }]);

    if (error) {
      console.error(`❌ Error inserting id ${item.id}:`, error.message);
    } else {
      console.log(`✅ Inserted id ${item.id}`);
    }
  }

  console.log('🎉 Import complete!');
}

importData();
