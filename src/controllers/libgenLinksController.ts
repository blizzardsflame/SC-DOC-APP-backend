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
    const newLink = new LibGenLink(linkData);
    await newLink.save();

    res.status(201).json({
      success: true,
      message: 'LibGen link created successfully',
      data: newLink
    } as ApiResponse);
  } catch (error: any) {
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

    const updatedLink = await LibGenLink.findByIdAndUpdate(id, updateData, { new: true });
    
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
