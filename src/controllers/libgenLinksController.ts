import type { Response } from 'express';
import type { AuthRequest, ApiResponse } from '../types/index.js';
import { LibGenLink } from '../models/LibGenLink.js';

// Get all LibGen links
export const getLibGenLinks = async (req: AuthRequest, res: Response) => {
  try {
    // Only staff can access LibGen links management
    const { user } = req;
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Staff only'
      } as ApiResponse);
    }

    const { type } = req.query;
    const filter: any = {};
    
    if (type && (type === 'search' || type === 'download')) {
      filter.type = type;
    }

    const links = await LibGenLink.find(filter).sort({ priority: 1, createdAt: 1 });

    res.json({
      success: true,
      data: links
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching LibGen links',
      error: error.message
    } as ApiResponse);
  }
};

// Create new LibGen link
export const createLibGenLink = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Staff only'
      } as ApiResponse);
    }

    const linkData = req.body;
    
    // Check if URL+type combination already exists (allow same URL for different types)
    if (linkData.url && linkData.type) {
      const existingLink = await LibGenLink.findOne({ 
        url: linkData.url,
        type: linkData.type
      });
      
      if (existingLink) {
        return res.status(400).json({
          success: false,
          message: `A LibGen link with this URL and type (${linkData.type}) already exists`,
          data: { conflictingUrl: linkData.url, conflictingType: linkData.type }
        } as ApiResponse);
      }
    }
    
    const newLink = new LibGenLink(linkData);
    await newLink.save();

    res.status(201).json({
      success: true,
      message: 'LibGen link created successfully',
      data: newLink
    } as ApiResponse);
  } catch (error: any) {
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate URL and type combination - This URL with this type already exists',
        error: 'URL and type combination must be unique'
      } as ApiResponse);
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationErrors.join(', ')
      } as ApiResponse);
    }

    res.status(400).json({
      success: false,
      message: 'Error creating LibGen link',
      error: error.message
    } as ApiResponse);
  }
};

// Update LibGen link
export const updateLibGenLink = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Staff only'
      } as ApiResponse);
    }

    const { id } = req.params;
    const updateData = req.body;

    // Validate required fields
    if (!updateData.name || !updateData.url || !updateData.type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, url, and type are required',
        data: { received: updateData }
      } as ApiResponse);
    }

    // Check if URL+type combination already exists (allow same URL for different types)
    if (updateData.url && updateData.type) {
      const existingLink = await LibGenLink.findOne({ 
        url: updateData.url,
        type: updateData.type,
        _id: { $ne: id } // Exclude current document
      });
      
      if (existingLink) {
        return res.status(400).json({
          success: false,
          message: `A LibGen link with this URL and type (${updateData.type}) already exists`,
          data: { conflictingUrl: updateData.url, conflictingType: updateData.type }
        } as ApiResponse);
      }
    }

    const updatedLink = await LibGenLink.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true // Ensure validation runs on update
    });
    
    if (!updatedLink) {
      return res.status(404).json({
        success: false,
        message: 'LibGen link not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'LibGen link updated successfully',
      data: updatedLink
    } as ApiResponse);
  } catch (error: any) {
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate URL - This URL already exists',
        error: 'URL must be unique'
      } as ApiResponse);
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: validationErrors.join(', ')
      } as ApiResponse);
    }

    res.status(400).json({
      success: false,
      message: 'Error updating LibGen link',
      error: error.message
    } as ApiResponse);
  }
};

// Delete LibGen link
export const deleteLibGenLink = async (req: AuthRequest, res: Response) => {
  try {
    const { user } = req;
    if (user?.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - Staff only'
      } as ApiResponse);
    }

    const { id } = req.params;
    const deletedLink = await LibGenLink.findByIdAndDelete(id);
    
    if (!deletedLink) {
      return res.status(404).json({
        success: false,
        message: 'LibGen link not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      message: 'LibGen link deleted successfully'
    } as ApiResponse);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting LibGen link',
      error: error.message
    } as ApiResponse);
  }
};
