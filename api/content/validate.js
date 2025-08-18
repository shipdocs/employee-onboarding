const { supabase } = require('../../lib/supabase');
const { requireManagerOrAdmin } = require('../../lib/auth');
const { apiRateLimit } = require('../../lib/rateLimit');
/**
 * Content Validation API
 * Validates training content structure, completeness, and quality
 */
async function handler(req, res) {
  try {

    const user = req.user;

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      phase_id,
      validate_structure = true,
      validate_content = true,
      validate_media = false,
      validate_accessibility = false
    } = req.body;

    if (!phase_id) {
      return res.status(400).json({ error: 'Phase ID is required' });
    }

    // Get phase data
    const { data: phase, error: phaseError } = await supabase
      .from('training_phases')
      .select('*')
      .eq('id', phase_id)
      .single();

    if (phaseError) {
      // console.error('❌ [DB] Error fetching phase:', phaseError);
      if (phaseError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Training phase not found' });
      }
      return res.status(500).json({ error: 'Failed to fetch training phase' });
    }

    const validationResults = {
      phase_id,
      phase_number: phase.phase_number,
      title: phase.title,
      overall_score: 0,
      is_valid: false,
      errors: [],
      warnings: [],
      suggestions: [],
      details: {}
    };

    let totalScore = 0;
    let maxScore = 0;

    // Structure validation
    if (validate_structure) {

      const structureResult = validateStructure(phase);
      validationResults.details.structure = structureResult;
      totalScore += structureResult.score;
      maxScore += structureResult.maxScore;

      validationResults.errors.push(...structureResult.errors);
      validationResults.warnings.push(...structureResult.warnings);
      validationResults.suggestions.push(...structureResult.suggestions);
    }

    // Content validation
    if (validate_content) {

      const contentResult = validateContent(phase);
      validationResults.details.content = contentResult;
      totalScore += contentResult.score;
      maxScore += contentResult.maxScore;

      validationResults.errors.push(...contentResult.errors);
      validationResults.warnings.push(...contentResult.warnings);
      validationResults.suggestions.push(...contentResult.suggestions);
    }

    // Media validation
    if (validate_media) {

      const mediaResult = await validateMedia(phase);
      validationResults.details.media = mediaResult;
      totalScore += mediaResult.score;
      maxScore += mediaResult.maxScore;

      validationResults.errors.push(...mediaResult.errors);
      validationResults.warnings.push(...mediaResult.warnings);
      validationResults.suggestions.push(...mediaResult.suggestions);
    }

    // Accessibility validation
    if (validate_accessibility) {

      const accessibilityResult = validateAccessibility(phase);
      validationResults.details.accessibility = accessibilityResult;
      totalScore += accessibilityResult.score;
      maxScore += accessibilityResult.maxScore;

      validationResults.errors.push(...accessibilityResult.errors);
      validationResults.warnings.push(...accessibilityResult.warnings);
      validationResults.suggestions.push(...accessibilityResult.suggestions);
    }

    // Calculate overall score
    validationResults.overall_score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const VALIDATION_THRESHOLD = parseInt(process.env.CONTENT_VALIDATION_THRESHOLD) || 70;
  validationResults.is_valid = validationResults.errors.length === 0 && validationResults.overall_score >= VALIDATION_THRESHOLD;

    return res.status(200).json(validationResults);

  } catch (_error) {
    // console.error('❌ [ERROR] Critical error in content validation:', _error);
    // console.error('❌ [ERROR] Stack trace:', error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      details: _error.message
    });
  }
}

/**
 * Validate phase structure
 */
function validateStructure(phase) {
  const result = {
    score: 0,
    maxScore: 100,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // Basic field validation (30 points)
  if (!phase.title || phase.title.trim().length === 0) {
    result.errors.push('Phase title is required');
  } else if (phase.title.trim().length < 5) {
    result.warnings.push('Phase title is very short (less than 5 characters)');
    result.score += 15;
  } else {
    result.score += 30;
  }

  if (!phase.description || phase.description.trim().length === 0) {
    result.warnings.push('Phase description is missing');
  } else if (phase.description.trim().length < 20) {
    result.warnings.push('Phase description is very short (less than 20 characters)');
    result.score += 10;
  } else {
    result.score += 20;
  }

  if (!phase.time_limit || phase.time_limit <= 0) {
    result.errors.push('Phase time limit must be greater than 0');
  } else {
    result.score += 10;
  }

  // Items validation (40 points)
  if (!phase.items || !Array.isArray(phase.items)) {
    result.errors.push('Phase items must be an array');
  } else if (phase.items.length === 0) {
    result.errors.push('Phase must have at least one training item');
  } else {
    result.score += 20;

    // Validate item structure
    let validItems = 0;
    const itemNumbers = new Set();

    phase.items.forEach((item, index) => {
      if (!item.title) {
        result.errors.push(`Item ${index + 1}: Title is required`);
      } else if (!item.number) {
        result.errors.push(`Item ${index + 1}: Number is required`);
      } else if (!item.category) {
        result.errors.push(`Item ${index + 1}: Category is required`);
      } else {
        validItems++;

        // Check for duplicate numbers
        if (itemNumbers.has(item.number)) {
          result.warnings.push(`Item ${index + 1}: Duplicate item number ${item.number}`);
        }
        itemNumbers.add(item.number);
      }
    });

    if (validItems === phase.items.length) {
      result.score += 20;
    } else {
      result.score += Math.round((validItems / phase.items.length) * 20);
    }
  }

  // Status validation (10 points)
  const validStatuses = ['draft', 'published', 'archived', 'pending_approval', 'rejected'];
  if (!phase.status || !validStatuses.includes(phase.status)) {
    result.warnings.push('Invalid or missing phase status');
  } else {
    result.score += 10;
  }

  return result;
}

/**
 * Validate phase content quality
 */
function validateContent(phase) {
  const result = {
    score: 0,
    maxScore: 100,
    errors: [],
    warnings: [],
    suggestions: []
  };

  if (!phase.items || !Array.isArray(phase.items)) {
    result.errors.push('No items to validate content for');
    return result;
  }

  let totalContentScore = 0;
  let itemsWithContent = 0;
  let itemsWithRichContent = 0;

  phase.items.forEach((item, index) => {
    let itemScore = 0;
    const itemNum = index + 1;

    // Check for content object
    if (!item.content) {
      result.warnings.push(`Item ${itemNum}: No content object found`);
      return;
    }

    itemsWithContent++;

    // Overview validation (25 points)
    if (!item.content.overview) {
      result.suggestions.push(`Item ${itemNum}: Consider adding an overview`);
    } else if (item.content.overview.length < 50) {
      result.suggestions.push(`Item ${itemNum}: Overview is quite short (${item.content.overview.length} characters)`);
      itemScore += 10;
    } else {
      itemScore += 25;
    }

    // Objectives validation (25 points)
    if (!item.content.objectives || !Array.isArray(item.content.objectives)) {
      result.suggestions.push(`Item ${itemNum}: Consider adding learning objectives`);
    } else if (item.content.objectives.length === 0) {
      result.suggestions.push(`Item ${itemNum}: Learning objectives array is empty`);
    } else {
      itemScore += 25;

      // Check objective quality
      const shortObjectives = item.content.objectives.filter(obj => obj.length < 10);
      if (shortObjectives.length > 0) {
        result.suggestions.push(`Item ${itemNum}: ${shortObjectives.length} learning objective(s) are very short`);
      }
    }

    // Key points validation (25 points)
    if (!item.content.keyPoints || !Array.isArray(item.content.keyPoints)) {
      result.suggestions.push(`Item ${itemNum}: Consider adding key points`);
    } else if (item.content.keyPoints.length === 0) {
      result.suggestions.push(`Item ${itemNum}: Key points array is empty`);
    } else {
      itemScore += 25;
    }

    // Procedures validation (25 points)
    if (!item.content.procedures || !Array.isArray(item.content.procedures)) {
      result.suggestions.push(`Item ${itemNum}: Consider adding procedures`);
    } else if (item.content.procedures.length === 0) {
      result.suggestions.push(`Item ${itemNum}: Procedures array is empty`);
    } else {
      itemScore += 25;
    }

    totalContentScore += itemScore;

    if (itemScore >= 75) {
      itemsWithRichContent++;
    }
  });

  // Calculate overall content score
  if (itemsWithContent > 0) {
    result.score = Math.round(totalContentScore / (itemsWithContent * 100) * 100);
  }

  // Content coverage analysis
  const contentCoverage = itemsWithContent / phase.items.length;
  const richContentCoverage = itemsWithRichContent / phase.items.length;

  if (contentCoverage < 0.5) {
    result.warnings.push(`Only ${Math.round(contentCoverage * 100)}% of items have content objects`);
  }

  if (richContentCoverage < 0.3) {
    result.suggestions.push(`Only ${Math.round(richContentCoverage * 100)}% of items have comprehensive content`);
  }

  return result;
}

/**
 * Validate media attachments
 */
async function validateMedia(phase) {
  const result = {
    score: 100, // Start with full score
    maxScore: 100,
    errors: [],
    warnings: [],
    suggestions: []
  };

  if (!phase.media_attachments || !Array.isArray(phase.media_attachments)) {
    result.suggestions.push('No media attachments found. Consider adding relevant images, videos, or documents');
    result.score = 50; // Partial score for no media
    return result;
  }

  if (phase.media_attachments.length === 0) {
    result.suggestions.push('No media files attached. Visual aids can improve learning effectiveness');
    result.score = 50;
    return result;
  }

  // Validate each media file
  phase.media_attachments.forEach((media, index) => {
    if (!media.file_name) {
      result.errors.push(`Media ${index + 1}: File name is missing`);
      result.score -= 10;
    }

    if (!media.file_path) {
      result.errors.push(`Media ${index + 1}: File path is missing`);
      result.score -= 10;
    }

    if (!media.file_type) {
      result.warnings.push(`Media ${index + 1}: File type is missing`);
      result.score -= 5;
    }

    if (!media.alt_text && media.file_type === 'image') {
      result.suggestions.push(`Media ${index + 1}: Consider adding alt text for accessibility`);
      result.score -= 5;
    }

    if (!media.description) {
      result.suggestions.push(`Media ${index + 1}: Consider adding a description`);
    }
  });

  // Ensure score doesn't go below 0
  result.score = Math.max(0, result.score);

  return result;
}

/**
 * Validate accessibility features
 */
function validateAccessibility(phase) {
  const result = {
    score: 0,
    maxScore: 100,
    errors: [],
    warnings: [],
    suggestions: []
  };

  let accessibilityScore = 0;

  // Check for alt text on images
  if (phase.media_attachments && Array.isArray(phase.media_attachments)) {
    const images = phase.media_attachments.filter(media => media.file_type === 'image');
    const imagesWithAltText = images.filter(img => img.alt_text && img.alt_text.trim().length > 0);

    if (images.length > 0) {
      const altTextCoverage = imagesWithAltText.length / images.length;
      accessibilityScore += altTextCoverage * 30;

      if (altTextCoverage < 1) {
        result.suggestions.push(`${images.length - imagesWithAltText.length} image(s) missing alt text`);
      }
    } else {
      accessibilityScore += 30; // No images to check
    }
  } else {
    accessibilityScore += 30; // No media to check
  }

  // Check content structure for screen readers
  if (phase.items && Array.isArray(phase.items)) {
    let structuredContent = 0;

    phase.items.forEach(item => {
      if (item.content) {
        // Check for proper heading structure (title)
        if (item.title && item.title.length > 0) {
          structuredContent += 10;
        }

        // Check for organized content (objectives, key points, procedures)
        if (item.content.objectives && Array.isArray(item.content.objectives) && item.content.objectives.length > 0) {
          structuredContent += 10;
        }

        if (item.content.keyPoints && Array.isArray(item.content.keyPoints) && item.content.keyPoints.length > 0) {
          structuredContent += 10;
        }
      }
    });

    const maxStructureScore = phase.items.length * 30;
    accessibilityScore += maxStructureScore > 0 ? (structuredContent / maxStructureScore) * 40 : 40;
  }

  // Check for clear language and readability
  let readabilityScore = 0;
  if (phase.description && phase.description.length > 0) {
    readabilityScore += 15;
  }

  if (phase.items && Array.isArray(phase.items)) {
    const itemsWithClearDescriptions = phase.items.filter(item =>
      item.description && item.description.length >= 20
    ).length;

    readabilityScore += (itemsWithClearDescriptions / phase.items.length) * 15;
  }

  accessibilityScore += readabilityScore;

  result.score = Math.round(accessibilityScore);

  if (result.score < 70) {
    result.suggestions.push('Consider improving accessibility with better alt text, structured content, and clear descriptions');
  }

  return result;
}

// Export with authentication wrapper
module.exports = apiRateLimit(requireManagerOrAdmin(handler));
