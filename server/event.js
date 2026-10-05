const { Event } = require('./event-models');
const { connectDB } = require('./db');

// Public — only currently-active events
async function getActiveEvents(req, res) {
  try {
    await connectDB();
    const now = new Date();
    const events = await Event.find({
      active: true,
      startDate: { $lte: now },
      endDate:   { $gte: now }
    }).sort({ order: 1, createdAt: -1 }).lean();
    // Fix 1: Prevent any proxy/browser from caching this endpoint so newly
    // created events are always visible on the very next homepage refresh.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('❌ getActiveEvents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Protected — all events (any status)
async function getAllEvents(req, res) {
  try {
    await connectDB();
    const events = await Event.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('❌ getAllEvents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Protected — create or update
async function createOrUpdateEvent(req, res) {
  try {
    await connectDB();
    const e = req.body || {};

    if (!e.title || !String(e.title).trim())
      return res.status(400).json({ success: false, message: 'Title is required' });

    if (!e.imageUrl || !String(e.imageUrl).trim())
      return res.status(400).json({ success: false, message: 'Image URL is required' });

    if (!e.startDate || !e.endDate)
      return res.status(400).json({ success: false, message: 'Start and End dates are required' });

    const startDate = new Date(e.startDate);
    const endDate   = new Date(e.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid dates' });

    if (endDate <= startDate)
      return res.status(400).json({ success: false, message: 'End date must be after start date' });

    const clean = {
      title:     String(e.title).trim(),
      imageUrl:  String(e.imageUrl).trim(),
      linkUrl:   String(e.linkUrl || '/#contact').trim(),
      startDate,
      endDate,
      active:    e.active !== undefined ? Boolean(e.active) : true,
      order:     Number(e.order) || 0
    };

    let saved;
    if (e._id) {
      saved = await Event.findByIdAndUpdate(
        e._id,
        { $set: clean },
        { new: true, runValidators: true }
      );
      if (!saved) return res.status(404).json({ success: false, message: 'Event not found' });
    } else {
      saved = await new Event(clean).save();
    }

    res.json({ success: true, message: 'Event saved successfully', data: saved });
  } catch (error) {
    console.error('❌ createOrUpdateEvent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// Protected — delete
async function deleteEvent(req, res) {
  try {
    await connectDB();
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('❌ deleteEvent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getActiveEvents, getAllEvents, createOrUpdateEvent, deleteEvent };
