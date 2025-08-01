const express = require('express');
const propertiesController = require('../controllers/properties');
const { authenticateToken } = require('../middleware/auth');
const { propertyValidator, mongoIdValidator, paginationValidator } = require('../validators');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Property ID
 *         name:
 *           type: string
 *           description: Property name
 *         address:
 *           type: string
 *           description: Property address
 *         type:
 *           type: string
 *           description: Property type (apartment, house, villa, etc.)
 *         bedrooms:
 *           type: integer
 *           description: Number of bedrooms
 *         guests:
 *           type: integer
 *           description: Maximum guest capacity
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *         pricing:
 *           type: object
 *           properties:
 *             basePrice:
 *               type: number
 *             cleaningFee:
 *               type: number
 *             currency:
 *               type: string
 *               default: EUR
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             city:
 *               type: string
 *             country:
 *               type: string
 */

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Get all properties
 *     description: Retrieve a paginated list of properties with optional filtering
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of properties per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *         description: Filter by property status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by property type
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city name
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     properties:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Property'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         current:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         limit:
 *                           type: integer
 */
router.get('/', authenticateToken, paginationValidator, propertiesController.getProperties);

/**
 * @swagger
 * /properties/stats:
 *   get:
 *     summary: Get property statistics
 *     description: Retrieve property statistics and overview metrics
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Property statistics retrieved successfully
 */
router.get('/stats', authenticateToken, propertiesController.getPropertyStats);

/**
 * @swagger
 * /properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     description: Retrieve a specific property by its ID
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 */
router.get('/:id', authenticateToken, mongoIdValidator, propertiesController.getProperty);

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Create new property
 *     description: Create a new property listing
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               type:
 *                 type: string
 *               bedrooms:
 *                 type: integer
 *               guests:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance]
 *                 default: active
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               pricing:
 *                 type: object
 *               location:
 *                 type: object
 *     responses:
 *       201:
 *         description: Property created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, propertyValidator, propertiesController.createProperty);

/**
 * @swagger
 * /properties/{id}:
 *   put:
 *     summary: Update property
 *     description: Update an existing property
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Property'
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       404:
 *         description: Property not found
 *       400:
 *         description: Validation error
 */
router.put('/:id', authenticateToken, mongoIdValidator, propertyValidator, propertiesController.updateProperty);

/**
 * @swagger
 * /properties/{id}:
 *   delete:
 *     summary: Delete property
 *     description: Delete a property listing
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *       404:
 *         description: Property not found
 */
router.delete('/:id', authenticateToken, mongoIdValidator, propertiesController.deleteProperty);

module.exports = router;
