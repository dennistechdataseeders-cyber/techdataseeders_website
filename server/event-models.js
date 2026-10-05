const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title:     { type: String, required: true, trim: true },
  imageUrl:  { type: String, required: true, trim: true },
  linkUrl:   { type: String, default: '/#contact', trim: true },
  startDate: { type: Date,   required: true },
  endDate:   { type: Date,   required: true },
  active:    { type: Boolean, default: true },
  order:     { type: Number,  default: 0 }
}, { timestamps: true });

EventSchema.index({ active: 1, startDate: 1, endDate: 1, order: 1 });

const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
module.exports = { Event };
