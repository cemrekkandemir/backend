const { addToWishlist, removeFromWishlist, getWishlist } = require('../Controller/wishlistController');
const User = require('../Models/User');
const Product = require('../Models/Product');

jest.mock('../Models/User');
jest.mock('../Models/Product');

describe('Wishlist Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            user: { id: 'mockUserId' },
            body: { productId: 'mockProductId' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    describe('addToWishlist', () => {
        test('should add product to wishlist successfully', async () => {
            const mockUser = {
                wishlist: [],
                save: jest.fn().mockResolvedValue(true)
            };
            const mockProduct = { _id: 'mockProductId' };

            User.findById.mockResolvedValue(mockUser);
            Product.findById.mockResolvedValue(mockProduct);

            await addToWishlist(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith('mockUserId');
            expect(Product.findById).toHaveBeenCalledWith('mockProductId');
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Product added to wishlist',
                wishlist: expect.any(Array)
            });
        });

        test('should handle user not found', async () => {
            User.findById.mockResolvedValue(null);

            await addToWishlist(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User not found'
            });
        });

        test('should handle database error', async () => {
            User.findById.mockRejectedValue(new Error('Database error'));

            await addToWishlist(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Error adding product to wishlist',
                details: 'Database error'
            });
        });
    });

    describe('removeFromWishlist', () => {
        test('should remove product from wishlist successfully', async () => {
            const mockUser = {
                wishlist: ['mockProductId'],
                save: jest.fn().mockResolvedValue(true)
            };

            User.findById.mockResolvedValue(mockUser);

            await removeFromWishlist(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith('mockUserId');
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Product removed from wishlist',
                wishlist: expect.any(Array)
            });
        });

        test('should handle user not found', async () => {
            User.findById.mockResolvedValue(null);

            await removeFromWishlist(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User not found'
            });
        });
    });

    describe('getWishlist', () => {
        test('should get populated wishlist successfully', async () => {
            const mockUser = {
                wishlist: ['mockProduct1', 'mockProduct2']
            };

            User.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockUser)
            });

            await getWishlist(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                wishlist: expect.any(Array)
            });
        });

        test('should handle user not found', async () => {
            User.findById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(null)
            });

            await getWishlist(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'User not found'
            });
        });
    });
});