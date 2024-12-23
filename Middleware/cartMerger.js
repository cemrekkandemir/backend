// Utils/cartMerger.js

const Cart = require('../Models/Cart');

const mergeCarts = async (userId, guestId) => {
  try {
    const guestCart = await Cart.findOne({ guestId });
    const userCart = await Cart.findOne({ userId });

    if (guestCart && guestCart.items.length > 0) {
      if (!userCart) {
        // Misafir sepetini kullanıcı sepeti olarak kaydet
        guestCart.userId = userId;
        guestCart.guestId = null;
        await guestCart.save();
      } else {
        // Misafir sepetindeki öğeleri kullanıcı sepetine ekle
        for (const guestItem of guestCart.items) {
          const existingItemIndex = userCart.items.findIndex(item =>
            item.productId.equals(guestItem.productId)
          );

          if (existingItemIndex > -1) {
            // Ürün zaten kullanıcı sepetinde varsa, miktarı güncelle
            userCart.items[existingItemIndex].quantity += guestItem.quantity;
          } else {
            // Ürün kullanıcı sepetinde yoksa, ekle
            userCart.items.push(guestItem);
          }
        }

        await userCart.save();
      }

      // **Misafir sepetini sil**
      await Cart.deleteOne({ _id: guestCart._id });
      console.log(`Misafir sepeti silindi: ${guestCart._id}`);
    }
  } catch (error) {
    console.error('Sepetleri birleştirirken hata oluştu:', error);
    throw error;
  }
};

module.exports = { mergeCarts };
