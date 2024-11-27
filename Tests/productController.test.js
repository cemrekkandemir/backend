const productController = require('../Controller/productController');
const Product = require('../Models/Product');

jest.mock('../Models/Product');

describe('productController', () => {
    describe('getProductById', () => {
        it('should return a product if found', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const product = { name: 'Test Product', price: 100 };
            Product.findById.mockResolvedValue(product);

            await productController.getProductById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(product);
        });

        it('should return 404 if product is not found', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findById.mockResolvedValue(null);

            await productController.getProductById(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
        });

        it('should return 500 on internal server error', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findById.mockRejectedValue(new Error('Internal server error'));

            await productController.getProductById(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });

    describe('createProducts', () => {
        it('should create multiple products successfully', async () => {
            const req = { body: [{ name: 'Product 1' }, { name: 'Product 2' }] };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const savedProducts = [{ name: 'Product 1' }, { name: 'Product 2' }];
            Product.insertMany.mockResolvedValue(savedProducts);

            await productController.createProducts(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({ message: 'Products created successfully.', data: savedProducts });
        });

        it('should return 400 if input is not an array', async () => {
            const req = { body: { name: 'Product 1' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

            await productController.createProducts(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: 'Input should be an array of products.' });
        });

        it('should return 500 on internal server error', async () => {
            const req = { body: [{ name: 'Product 1' }, { name: 'Product 2' }] };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.insertMany.mockRejectedValue(new Error('Internal server error'));

            await productController.createProducts(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });
    describe('createProduct', () => {
        it('should create a new product successfully', async () => {
            const req = { body: { name: 'Product 1', description: 'Description', price: 100, category: 'Category', brand: 'Brand', stock: 10, imageURL: 'http://example.com/image.jpg' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const savedProduct = { name: 'Product 1', description: 'Description', price: 100, category: 'Category', brand: 'Brand', stock: 10, imageURL: 'http://example.com/image.jpg' };
            Product.prototype.save = jest.fn().mockResolvedValue(savedProduct);
    
            await productController.createProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(savedProduct);
        });
    
        it('should return 500 on internal server error', async () => {
            const req = { body: { name: 'Product 1', description: 'Description', price: 100, category: 'Category', brand: 'Brand', stock: 10, imageURL: 'http://example.com/image.jpg' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.prototype.save = jest.fn().mockRejectedValue(new Error('Internal server error'));
    
            await productController.createProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });
    describe('updateProduct', () => {
        it('should update a product successfully', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' }, body: { name: 'Updated Product' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const updatedProduct = { _id: '60d21b4667d0d8992e610c85', name: 'Updated Product' };
            Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);
    
            await productController.updateProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(updatedProduct);
        });
    
        it('should return 404 if product is not found', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' }, body: { name: 'Updated Product' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findByIdAndUpdate.mockResolvedValue(null);
    
            await productController.updateProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
        });
    
        it('should return 500 on internal server error', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' }, body: { name: 'Updated Product' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findByIdAndUpdate.mockRejectedValue(new Error('Internal server error'));
    
            await productController.updateProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });
    describe('deleteProduct', () => {
        it('should delete a product successfully', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const deletedProduct = { _id: '60d21b4667d0d8992e610c85', name: 'Deleted Product' };
            Product.findByIdAndDelete.mockResolvedValue(deletedProduct);
    
            await productController.deleteProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
        });
    
        it('should return 404 if product is not found', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findByIdAndDelete.mockResolvedValue(null);
    
            await productController.deleteProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
        });
    
        it('should return 500 on internal server error', async () => {
            const req = { params: { id: '60d21b4667d0d8992e610c85' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findByIdAndDelete.mockRejectedValue(new Error('Internal server error'));
    
            await productController.deleteProduct(req, res);
    
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });
    describe('getAllProducts', () => {
        it('should return all products successfully', async () => {
            const req = {};
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const products = [{ name: 'Product 1' }, { name: 'Product 2' }];
            Product.find.mockResolvedValue(products);
    
            await productController.getAllProducts(req, res);
    
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(products);
        });
    
        it('should return 500 on internal server error', async () => {
            const req = {};
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.find.mockRejectedValue(new Error('Internal server error'));
    
            await productController.getAllProducts(req, res);
    
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
        });
    });
    describe('updateCommentVisibility', () => {
        it('should update comment visibility successfully', async () => {
            const req = { params: { productId: '60d21b4667d0d8992e610c85', feedbackId: '60d21b4667d0d8992e610c86' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const feedback = { _id: '60d21b4667d0d8992e610c86', text: 'Great product!', isVisible: false };
            const product = { feedback: { id: jest.fn().mockReturnValue(feedback) }, save: jest.fn().mockResolvedValue({}) };
            Product.findById.mockResolvedValue(product);
    
            await productController.updateCommentVisibility(req, res);
    
            expect(feedback.isVisible).toBe(true);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Comment visibility updated.', feedback });
        });
    
        it('should return 400 for invalid product or feedback ID', async () => {
            const req = { params: { productId: 'invalid', feedbackId: 'invalid' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    
            await productController.updateCommentVisibility(req, res);
    
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid product or feedback ID' });
        });
    
        it('should return 404 if product is not found', async () => {
            const req = { params: { productId: '60d21b4667d0d8992e610c85', feedbackId: '60d21b4667d0d8992e610c86' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findById.mockResolvedValue(null);
    
            await productController.updateCommentVisibility(req, res);
    
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
        });
    
        it('should return 404 if feedback is not found', async () => {
            const req = { params: { productId: '60d21b4667d0d8992e610c85', feedbackId: '60d21b4667d0d8992e610c86' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const product = { feedback: { id: jest.fn().mockReturnValue(null) } };
            Product.findById.mockResolvedValue(product);
    
            await productController.updateCommentVisibility(req, res);
    
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Feedback not found' });
        });
    
        it('should return 400 if feedback does not include a comment', async () => {
            const req = { params: { productId: '60d21b4667d0d8992e610c85', feedbackId: '60d21b4667d0d8992e610c86' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            const feedback = { _id: '60d21b4667d0d8992e610c86', text: '', isVisible: false };
            const product = { feedback: { id: jest.fn().mockReturnValue(feedback) } };
            Product.findById.mockResolvedValue(product);
    
            await productController.updateCommentVisibility(req, res);
    
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'This feedback does not include a comment.' });
        });
    
        it('should return 500 on internal server error', async () => {
            const req = { params: { productId: '60d21b4667d0d8992e610c85', feedbackId: '60d21b4667d0d8992e610c86' } };
            const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
            Product.findById.mockRejectedValue(new Error('Internal server error'));
    
            await productController.updateCommentVisibility(req, res);
    
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update comment visibility.' });
        });
    });
});