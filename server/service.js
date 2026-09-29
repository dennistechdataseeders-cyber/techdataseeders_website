const { getServices, getServiceBySlug, saveService, deleteService: deleteServiceFromDB } = require('./db');

function parseOffers(raw) {
  if (Array.isArray(raw)) {
    return raw.map(o => ({
      icon: (o.icon || '').trim(),
      title: (o.title || '').trim(),
      desc: (o.desc || '').trim()
    })).filter(o => o.title || o.desc);
  }
  if (typeof raw === 'string') {
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(s => s.trim());
        return {
          icon: parts[0] || '',
          title: parts[1] || '',
          desc: parts.slice(2).join(' | ') || ''
        };
      })
      .filter(o => o.title || o.desc);
  }
  return [];
}

function parseWhyPoints(raw) {
  if (Array.isArray(raw)) {
    return raw.map(w => ({
      title: (w.title || '').trim(),
      desc: (w.desc || '').trim()
    })).filter(w => w.title || w.desc);
  }
  if (typeof raw === 'string') {
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(s => s.trim());
        return {
          title: parts[0] || '',
          desc: parts.slice(1).join(' | ') || ''
        };
      })
      .filter(w => w.title || w.desc);
  }
  return [];
}

function parseProcessSteps(raw) {
  if (Array.isArray(raw)) {
    return raw.map(p => ({
      num: (p.num || '').trim(),
      title: (p.title || '').trim(),
      desc: (p.desc || '').trim()
    })).filter(p => p.title || p.desc);
  }
  if (typeof raw === 'string') {
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(s => s.trim());
        return {
          num: parts[0] || '',
          title: parts[1] || '',
          desc: parts.slice(2).join(' | ') || ''
        };
      })
      .filter(p => p.title || p.desc);
  }
  return [];
}

async function getAllServices(req, res) {
  try {
    const services = await getServices();
    res.json({ success: true, data: services });
  } catch (error) {
    console.error('❌ Error in getAllServices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getService(req, res) {
  try {
    const { slug } = req.params;
    const service = await getServiceBySlug(slug);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('❌ Error in getService:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createOrUpdateService(req, res) {
  try {
    const service = req.body;

    if (!service || typeof service !== 'object') {
      console.error('❌ Invalid or missing request body:', service);
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. Please check your data.'
      });
    }

    console.log('📝 Received service data:', {
      title: service.title,
      slug: service.slug,
      originalSlug: service.originalSlug || (service._id ? 'has _id' : 'new'),
      hasId: !!service._id
    });

    if (!service.title || !service.title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    if (!service.slug || !service.slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required'
      });
    }

    const cleanService = {
      slug: service.slug.trim().toLowerCase(),
      title: service.title.trim(),
      navLabel: (service.navLabel || '').trim(),
      tagline: (service.tagline || '').trim(),
      badge: (service.badge || '').trim(),
      heroImage: (service.heroImage || '').trim(),
      introKicker: (service.introKicker || '').trim(),
      introHeading: (service.introHeading || '').trim(),
      introBody: (service.introBody || '').trim(),
      offers: parseOffers(service.offers),
      whyPoints: parseWhyPoints(service.whyPoints),
      processSteps: parseProcessSteps(service.processSteps),
      order: Number(service.order) || 0,
      published: service.published !== undefined ? Boolean(service.published) : true,
      metaTitle: (service.metaTitle || '').trim(),
      metaDescription: (service.metaDescription || '').trim()
    };

    if (service._id) {
      cleanService._id = service._id;
    }

    // Check duplicate slug
    const allServices = await getServices();
    let existing = null;

    if (service._id) {
      existing = allServices.find(s => s._id && s._id.toString() === service._id.toString());
    } else if (service.originalSlug) {
      existing = allServices.find(s => s.slug === service.originalSlug);
    }

    const duplicateSlug = allServices.some(function(s) {
      if (existing && s._id && s._id.toString() === existing._id.toString()) {
        return false;
      }
      return s.slug === cleanService.slug;
    });

    if (duplicateSlug) {
      return res.status(400).json({
        success: false,
        message: 'A service with this slug already exists'
      });
    }

    const savedService = await saveService(cleanService);

    if (!savedService) {
      console.error('❌ saveService returned null or undefined');
      return res.status(500).json({
        success: false,
        message: 'Failed to save service - database operation returned no result'
      });
    }

    console.log('✅ Service saved successfully:', savedService.title);

    res.json({
      success: true,
      message: 'Service saved successfully',
      data: savedService
    });
  } catch (error) {
    console.error('❌ Error in createOrUpdateService:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A service with this slug already exists in the database'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save service'
    });
  }
}

async function deleteService(req, res) {
  try {
    const id = req.params.id;
    const success = await deleteServiceFromDB(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteService:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getAllServices,
  getService,
  createOrUpdateService,
  deleteService
};
