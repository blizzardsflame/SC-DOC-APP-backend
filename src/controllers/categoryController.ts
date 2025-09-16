import type { Request, Response } from 'express';
import { Category } from '../models/Category.js';
import { Book } from '../models/Book.js';
import type { AuthRequest, ApiResponse } from '../types/index.js';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { parent } = req.query;

    // Build query for hierarchical structure
    const query: any = {};
    if (parent === 'null' || parent === undefined) {
      query.parent = null; // Root categories
    } else if (parent) {
      query.parent = parent; // Subcategories
    }

    const categories = await Category.find(query)
      .populate('parent', 'name')
      .sort({ name: 1 });

    // Get subcategories count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const subcategoriesCount = await Category.countDocuments({ parent: category._id });
        const booksCount = await Book.countDocuments({ category: category._id });
        
        return {
          ...category.toObject(),
          subcategoriesCount,
          booksCount
        };
      })
    );

    res.json({
      success: true,
      message: 'Catégories récupérées avec succès',
      data: { categories: categoriesWithCounts }
    } as ApiResponse);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories'
    } as ApiResponse);
  }
};

export const getCategoryTree = async (req: Request, res: Response) => {
  try {
    // Get all categories
    const allCategories = await Category.find().sort({ name: 1 });

    // Build hierarchical tree
    const buildTree = (parentId: string | null = null): any[] => {
      return allCategories
        .filter(cat => {
          if (parentId === null) return cat.parent === null || cat.parent === undefined;
          return cat.parent?.toString() === parentId;
        })
        .map(category => ({
          ...category.toObject(),
          children: buildTree(category._id.toString())
        }));
    };

    const categoryTree = buildTree();

    res.json({
      success: true,
      message: 'Arbre des catégories récupéré avec succès',
      data: { categories: categoryTree }
    } as ApiResponse);
  } catch (error) {
    console.error('Get category tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'arbre des catégories'
    } as ApiResponse);
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate('parent', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      } as ApiResponse);
    }

    // Get subcategories and books count
    const subcategoriesCount = await Category.countDocuments({ parent: id });
    const booksCount = await Book.countDocuments({ category: id });

    res.json({
      success: true,
      message: 'Catégorie récupérée avec succès',
      data: {
        category: {
          ...category.toObject(),
          subcategoriesCount,
          booksCount
        }
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la catégorie'
    } as ApiResponse);
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, parent, description } = req.body;

    // Check if parent category exists if provided
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie parent non trouvée'
        } as ApiResponse);
      }
    }

    // Check if category with same name and parent already exists
    const existingCategory = await Category.findOne({ name, parent: parent || null });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà dans cette hiérarchie'
      } as ApiResponse);
    }

    const category = new Category({
      name,
      parent: parent || null,
      description
    });

    await category.save();

    const populatedCategory = await Category.findById(category._id).populate('parent', 'name');

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: { category: populatedCategory }
    } as ApiResponse);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la catégorie'
    } as ApiResponse);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parent, description } = req.body;

    // Check if parent category exists if provided
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        return res.status(400).json({
          success: false,
          message: 'Catégorie parent non trouvée'
        } as ApiResponse);
      }

      // Prevent circular reference
      if (parent === id) {
        return res.status(400).json({
          success: false,
          message: 'Une catégorie ne peut pas être son propre parent'
        } as ApiResponse);
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { name, parent: parent || null, description },
      { new: true, runValidators: true }
    ).populate('parent', 'name');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: { category }
    } as ApiResponse);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la catégorie'
    } as ApiResponse);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category has subcategories
    const subcategoriesCount = await Category.countDocuments({ parent: id });
    if (subcategoriesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une catégorie qui contient des sous-catégories'
      } as ApiResponse);
    }

    // Check if category has books
    const booksCount = await Book.countDocuments({ 
      $or: [{ category: id }, { subcategory: id }] 
    });
    if (booksCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une catégorie qui contient des livres'
      } as ApiResponse);
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    } as ApiResponse);
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la catégorie'
    } as ApiResponse);
  }
};
