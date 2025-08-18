// Vercel API Route: /api/templates/[id]/rename.js - Rename PDF template
const { supabase } = require('../../../lib/supabase');
const { requireAdmin } = require('../../../lib/auth');
const { adminRateLimit } = require('../../../lib/rateLimit');

module.exports = adminRateLimit(requireAdmin(async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { name } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Valid template name is required' });
  }

  try {
    const user = req.user;
    const trimmedName = name.trim();

    // First check if template exists and user owns it
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('pdf_templates')
      .select('id, name, created_by')
      .eq('id', id)
      .eq('created_by', user.userId)
      .single();

    if (fetchError || !existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check if the name is actually different
    if (existingTemplate.name === trimmedName) {
      return res.json({
        success: true,
        message: 'Template name unchanged',
        template: {
          id: existingTemplate.id,
          name: existingTemplate.name
        }
      });
    }

    // Check if another template with the same name already exists for this user
    const { data: duplicateTemplate, error: duplicateError } = await supabase
      .from('pdf_templates')
      .select('id')
      .eq('name', trimmedName)
      .eq('created_by', user.userId)
      .neq('id', id)
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is what we want
      // console.error('Error checking for duplicate template name:', duplicateError);
      return res.status(500).json({ error: 'Failed to validate template name' });
    }

    if (duplicateTemplate) {
      return res.status(409).json({
        error: 'A template with this name already exists',
        conflictingTemplateId: duplicateTemplate.id
      });
    }

    // Update the template name
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('pdf_templates')
      .update({
        name: trimmedName,
        updated_by: user.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('created_by', user.userId)
      .select('id, name, updated_at')
      .single();

    if (updateError) {
      // console.error('Error updating template name:', updateError);
      return res.status(500).json({ error: 'Failed to update template name' });
    }

    if (!updatedTemplate) {
      return res.status(404).json({ error: 'Template not found after update' });
    }

    res.json({
      success: true,
      message: 'Template renamed successfully',
      template: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        updatedAt: updatedTemplate.updated_at
      },
      previousName: existingTemplate.name
    });

  } catch (_error) {
    // console.error('Template rename error:', _error);
    res.status(500).json({ error: 'Failed to rename template' });
  }
}));
