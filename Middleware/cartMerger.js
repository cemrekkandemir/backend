const mergeCarts = async (req, res, next) => {
    try {
      const userId = req.user?._id; 
      const guestId = req.sessionID; 
  
      if (userId && guestId) {
        console.log("Merging carts for userId:", userId, "and guestId:", guestId);
  
        const guestCart = await Cart.findOne({ guestId });
        if (guestCart) {
          
          let userCart = await Cart.findOne({ userId });
          if (!userCart) {
            userCart = new Cart({ userId, items: [] });
          }
  
          
          guestCart.items.forEach(guestItem => {
            const existingItem = userCart.items.find(item =>
              item.productId.equals(guestItem.productId)
            );
            if (existingItem) {
              existingItem.quantity += guestItem.quantity;
            } else {
              userCart.items.push(guestItem);
            }
          });

          await guestCart.deleteOne();
          await userCart.save();
  
          console.log("Carts merged successfully.");
        }
      }
  
      next();
    } catch (error) {
      console.error("Error merging carts:", error);
      next(error);
    }
  };
  
  module.exports = mergeCarts;