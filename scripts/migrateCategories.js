require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../Models/Product');   // "../Models" dedik, çünkü scripts klasörü ile Models aynı seviyede
const Category = require('../Models/Category');

(async () => {
  try {
    // Veritabanına bağlan
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1) Product tablosundan distinct kategorileri al
    const categories = await Product.distinct("category");

    for (const cat of categories) {
      if (!cat || cat === "Uncategorized") {
        continue;
      }

      // 3) Category tablosunda zaten var mı kontrol et
      const existing = await Category.findOne({ name: cat });
      if (!existing) {
        // Yoksa ekle
        const newCat = new Category({ name: cat });
        await newCat.save();
        console.log(`Category "${cat}" added to Category collection.`);
      } else {
        // Varsa geç
        console.log(`Category "${cat}" already exists, skipping.`);
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    // Bağlantıyı kapat
    mongoose.connection.close();
  }
})();
