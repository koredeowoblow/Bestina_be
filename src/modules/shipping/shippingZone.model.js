import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema(
  {
    region: { type: String, required: true },
    states: [{ type: String }],
    baseFeeKobo: { type: Number, required: true },
    expressFeeKobo: { type: Number, default: 0 },
    minDays: { type: Number, required: true },
    maxDays: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("ShippingZone", shippingZoneSchema);
